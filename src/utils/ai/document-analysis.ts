import { Readable } from 'stream';
import dotenv from 'dotenv';
import fetch, { Response } from 'node-fetch';
import FormData from 'form-data';

dotenv.config();

function bufferToStream(buffer: Buffer): Readable {
  const readable = new Readable();
  readable.push(buffer);
  readable.push(null); // End the stream
  return readable;
}


export async function analyzePdfLayout(pdfData: Buffer, pdfName: string) {
  try {
    const formData = new FormData();
    
    formData.append('file', bufferToStream(pdfData), { filename: pdfName, contentType: 'application/pdf' });
    formData.append('fast', 'true');

    const response: Response = await fetch(`${process.env.DOCUMENT_ANALYSIS_SERVER_URL}`, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.statusText}`);
    }

    // Parse and return the JSON response
    const jsonResponse = await response.json();
    return jsonResponse;
  } catch (error) {
    console.error('Error analyzing PDF layout:', error);
    throw error; // You can customize how you handle the error (e.g., return a custom error message)
  }
}
