import { Request, Response } from "express";
import { getDbConnection } from "../utils/storage/database";
import { v4 as uuidv4 } from "uuid";
import jwt from 'jsonwebtoken';
import { toBase64 } from "openai/core";

class TransactionController {  
  constructor() {
    this.createTokenPurchaseCheckoutSession = this.createTokenPurchaseCheckoutSession.bind(this)
    this.getTokenPurchaseCheckoutSessionStatus = this.getTokenPurchaseCheckoutSessionStatus.bind(this)
  }

/**
 * 
 * @param req The request object
 * @param res The response data
 */
  async createTokenPurchaseCheckoutSession(req: Request, res: Response) {
    // const token = req.cookies.authToken;
    // if (!token) {
    //     return res.status(403).json({ message: 'No token provided' });
    // }

    // try {
    //     jwt.verify(token, process.env.JWT_SECRET_KEY as string);
    // } catch (error) {
    //     return res.status(403).json({ message: 'Invalid token' });
    // }
    console.log(toBase64(process.env.NEXT_PUBLIC_PM_API_KEY+':'));
    const { amount, currency, description, name } = req.body;

    try {
      const response: any = await fetch('https://api.paymongo.com/v1/checkout_sessions', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          authorization: `Basic ${toBase64(process.env.NEXT_PUBLIC_PM_API_KEY+':')}`, // encoded key
        },
        body: JSON.stringify({
          data: {
            attributes: {
              line_items: [
                {
                  amount: amount,
                  currency: currency,
                  description: description,
                  name: name,
                  quantity: 1,
                },
              ],
              payment_method_types: ['gcash'],
              reference_number: uuidv4(),
              send_email_receipt: true,
              show_description: true,
              show_line_items: true,
              success_url: 'http://localhost:4000/transaction',
              cancel_url: 'http://localhost:4000/cancel_payment',
              description: 'checkout description',
            },
          },
        }),
      });
  
      if (response.ok) {
        const responseData: any = await response.json();
        console.log(responseData)
        return res.status(200).json(responseData);
      } else {
        return res.status(400).json({ message: 'Failed to create checkout session: ' + response.statusText });
      }
    } catch (error) {
      return res.status(400).json({ message: 'Error creating checkout session:', error });
    }
  }

  async getTokenPurchaseCheckoutSessionStatus(req: Request, res: Response) {
    const sessionId = req.params.sessionId

    try {
      const response: any = await fetch(`https://api.paymongo.com/v1/checkout_sessions/${sessionId}`, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          authorization: `Basic ${toBase64(process.env.NEXT_PUBLIC_PM_API_KEY+':')}`, // encoded key
        },
      });
  
      if (response.ok) {
        const responseData: any = await response.json();
        console.log(responseData)
        return res.status(200).json(responseData);
      } else {
        return res.status(400).json({ message: 'Failed to retrieve checkout status: ' + response.statusText });
      }
    } catch (error) {
      return res.status(400).json({ message: 'Error retrieving checkout status:', error });
    }
  }
}

export default new TransactionController();