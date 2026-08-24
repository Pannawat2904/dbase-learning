import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { text, numQuestions } = await req.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text content is required' }, { status: 400 });
    }

    const apiKeyString = process.env.GEMINI_API_KEY;
    if (!apiKeyString) {
      console.log('No GEMINI_API_KEY found, using mock data for AI Quiz Generator.');
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockQuestions = Array.from({ length: numQuestions || 3 }).map((_, i) => ({
        id: `mock-ai-q-${Date.now()}-${i}`,
        type: 'multiple-choice',
        text: `(โจทย์สมมติจาก AI) ข้อความที่คุณป้อนคือ: "${text.substring(0, 20)}..." คำถามข้อที่ ${i + 1} คืออะไร?`,
        options: [
          'ตัวเลือกที่ 1 (คำตอบที่ผิด)',
          'ตัวเลือกที่ 2 (คำตอบที่ถูกต้อง)',
          'ตัวเลือกที่ 3 (คำตอบที่ผิด)',
          'ตัวเลือกที่ 4 (คำตอบที่ผิด)'
        ],
        correctOptionIndex: 1,
        explanation: 'นี่คือคำอธิบายสมมติจาก AI ว่าทำไมถึงตอบข้อนี้'
      }));

      return NextResponse.json({ questions: mockQuestions });
    }
    // Support multiple API keys by splitting with comma
    const apiKeys = apiKeyString.split(',').map(k => k.trim()).filter(Boolean);
    const apiKey = apiKeys[Math.floor(Math.random() * apiKeys.length)];

    // Actual Gemini API Call
    const prompt = `
      คุณคือครูผู้เชี่ยวชาญการออกข้อสอบ
      กรุณาสร้างข้อสอบแบบปรนัย (Multiple Choice) จำนวน ${numQuestions} ข้อ จากเนื้อหาต่อไปนี้:
      
      """
      ${text}
      """
      
      ให้ส่งคืนผลลัพธ์เป็น JSON Array เท่านั้น โดยแต่ละข้อมีโครงสร้างดังนี้:
      {
        "id": "random-uuid-string",
        "type": "multiple-choice",
        "text": "โจทย์คำถาม",
        "options": ["ช้อยส์ 1", "ช้อยส์ 2", "ช้อยส์ 3", "ช้อยส์ 4"],
        "correctOptionIndex": 0, // index ของข้อที่ถูก (0-3)
        "explanation": "คำอธิบายเฉลย"
      }
      
      ส่งคืนแค่ JSON Array เท่านั้น ห้ามมีข้อความอื่นปน
    `;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        }
      })
    });

    if (!response.ok) {
      throw new Error('Failed to generate content from Gemini');
    }

    const data = await response.json();
    let generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!generatedText) {
      throw new Error('No content returned from AI');
    }
    
    // Parse JSON
    let parsedQuestions = [];
    try {
      parsedQuestions = JSON.parse(generatedText);
    } catch (parseError) {
      // Sometime AI wraps json in markdown code block
      generatedText = generatedText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedQuestions = JSON.parse(generatedText);
    }

    // Ensure all questions have IDs
    const finalQuestions = parsedQuestions.map((q: any, idx: number) => ({
      ...q,
      id: q.id || `ai-q-${Date.now()}-${idx}`
    }));

    return NextResponse.json({ questions: finalQuestions });
    
  } catch (error: any) {
    console.error('API Error in AI Quiz Generator:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
