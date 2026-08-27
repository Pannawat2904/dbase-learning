import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const apiKeyString = process.env.GEMINI_API_KEY;
    if (!apiKeyString) {
      return NextResponse.json(
        { error: "กรุณาตั้งค่า GEMINI_API_KEY ในไฟล์ .env.local ก่อนเริ่มใช้งาน" },
        { status: 500 }
      );
    }

    // Support multiple API keys by splitting with comma
    const apiKeys = apiKeyString.split(',').map(k => k.trim()).filter(Boolean);
    const apiKey = apiKeys[Math.floor(Math.random() * apiKeys.length)];

    const body = await req.json();
    const { message } = body;

    if (!message) {
      return NextResponse.json(
        { error: "ไม่พบข้อความส่งมา" },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });
    
    // Load the knowledge base
    let knowledgeContext = "";
    try {
      const fs = require('fs');
      const path = require('path');
      const knowledgePath = path.join(process.cwd(), 'src/data/chatbot-knowledge.json');
      if (fs.existsSync(knowledgePath)) {
        const knowledgeData = fs.readFileSync(knowledgePath, 'utf8');
        knowledgeContext = `\nข้อมูลประกอบการตอบคำถาม (Knowledge Base):\n${knowledgeData}\nคุณต้องตอบคำถามโดยอ้างอิงจากข้อมูลด้านบนนี้เป็นหลัก หากมีข้อมูลในนี้ให้ตอบตามนี้ หากไม่มีให้ตอบตามความรู้ทั่วไปแต่ต้องเกี่ยวข้องกับวิชาโปรแกรมฐานข้อมูล`;
      }
    } catch (e) {
      console.error("Failed to load knowledge base:", e);
    }

    const systemPrompt = `คุณคือผู้ช่วยให้คำปรึกษาและแนะนำในรายวิชา 'โปรแกรมฐานข้อมูล' ให้แก่นักเรียนระดับชั้น ปวช.2/2 สาขาเทคโนโลยีธุรกิจดิจิทัล
กฎที่ต้องปฏิบัติตามอย่างเคร่งครัด:
1. ให้แทนตัวเองว่า "น้องบอท" เสมอในทุกๆ การสนทนา
2. ต้องลงท้ายประโยคคำตอบด้วยคำว่า "ครับ" เสมอทุกครั้ง
3. ให้คำปรึกษาได้ทั้งเรื่องเนื้อหาวิชาเรียน และการใช้งานระบบเว็บไซต์นี้
4. ให้จัดรูปแบบการตอบให้สวยงาม อ่านง่าย โดยใช้ Markdown (เช่น **ตัวหนา**, bullet point, การเว้นบรรทัด)
5. ตอบคำถามด้วยความเป็นมิตร เข้าใจง่าย เหมาะสมกับวัยรุ่นอาชีวศึกษา
6. ตอบคำถามให้ครบถ้วนและอธิบายให้ชัดเจน ห้ามตอบแบบตัดจบประโยคหรือตอบไม่ครบถ้วนเด็ดขาด หากข้อมูลมีความยาวให้สรุปเป็นหัวข้อย่อยๆ ให้เข้าใจง่าย
7. ในการตอบคำถามหรือแนะนำตัว ไม่ต้องใส่คำว่า "by kruball" หรือ "By KruBall" ให้แนะนำตัวว่าเป็น "น้องบอท"
${knowledgeContext}

คำถามจากนักเรียน:
${message}`;

    // Use streaming for faster perceived response time
    const result = await model.generateContentStream({
      contents: [
        {
          role: "user",
          parts: [{ text: systemPrompt }],
        },
      ],
      generationConfig: {
        maxOutputTokens: 4096,
        temperature: 0.7,
      },
    });

    const stream = new ReadableStream({
      async start(controller) {
        let fullResponse = "";
        try {
          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            fullResponse += chunkText;
            controller.enqueue(new TextEncoder().encode(chunkText));
          }
        } catch (err) {
          console.error("Stream reading error:", err);
        } finally {
          controller.close();
          // Log to database after stream completes
          if (user && fullResponse) {
            supabase.from('ai_chat_logs').insert({
              student_id: user.id,
              question: message,
              answer: fullResponse
            }).then(({ error }) => {
              if (error) console.error("Error logging AI chat:", error);
            });
          }
        }
      }
    });

    return new NextResponse(stream, {
      headers: { 
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked"
      },
    });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    let errorMessage = "เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI: " + (error.message || "Unknown Error");
    let statusCode = 500;
    
    // Handle Rate Limit / Quota Exceeded (429)
    if (error.status === 429 || error.message?.includes("429") || error.message?.includes("quota")) {
      errorMessage = "ตอนนี้น้องบอทมีเพื่อนๆ ถามเข้ามาเยอะมากเลยครับ รบกวนรอสัก 10-20 วินาทีแล้วลองถามใหม่นะครับ 😊";
      statusCode = 429;
    }
    // Handle High Demand / Service Unavailable (503)
    else if (error.status === 503 || error.message?.includes("503") || error.message?.includes("high demand")) {
      errorMessage = "เซิร์ฟเวอร์ของน้องบอทกำลังทำงานหนักมากในตอนนี้ รบกวนรอสักครู่แล้วลองส่งคำถามใหม่อีกครั้งนะครับ 😅";
      statusCode = 503;
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}
