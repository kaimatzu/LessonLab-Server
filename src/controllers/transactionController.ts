import { Request, Response } from "express";
import { getDbConnection } from "../utils/storage/database";
import { v4 as uuidv4 } from "uuid";
import jwt from 'jsonwebtoken';
import { toBase64 } from "openai/core";
import { uuid } from "uuidv4/build/lib/uuidv4";

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
    console.log(toBase64(process.env.NEXT_PUBLIC_PM_API_KEY+':'));
    const { amount, currency, description, name } = req.body;
    const reference_number = uuidv4();

    try {
        const response = await fetch('https://api.paymongo.com/v1/checkout_sessions', {
            method: 'POST',
            headers: {
                accept: 'application/json',
                'Content-Type': 'application/json',
                authorization: `Basic ${toBase64(process.env.NEXT_PUBLIC_PM_API_KEY+':')}`,
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
                        reference_number: reference_number,
                        send_email_receipt: true,
                        show_description: true,
                        show_line_items: true,
                        success_url: `http://localhost:4000/transaction?ref=${reference_number}`,
                        cancel_url: 'http://localhost:4000/cancel_payment',
                        description: 'checkout description',
                    },
                },
            }),
        });

        if (!response.ok) {
            return res.status(400).json({ message: 'Failed to create checkout session: ' + response.statusText });
        }

        const responseData = await response.json() as { data?: any };
        console.log("Full PayMongo Response:", JSON.stringify(responseData, null, 2));

        const sessionId = responseData?.data?.id;

        if (!sessionId) {
            console.error("No session ID returned from PayMongo.");
            return res.status(500).json({ message: 'No session ID returned from PayMongo', responseData });
        }

        console.log("Checkout Session Created. Session ID:", sessionId);
        console.log("Checkout Session ID:", )

        return res.status(200).json({
          data: {
              attributes: {
                  checkout_url: responseData.data.attributes.checkout_url,
              },
              id: sessionId
          }
        });

    } catch (error) {
        console.error("Error creating checkout session:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
  }

  async getTokenPurchaseCheckoutSessionStatus(req: Request, res: Response) {
    try {
        console.log("Incoming Request:", req.params);

        const sessionId = req.params.sessionId || req.query.sessionId;
        if (!sessionId) {
            console.warn("Missing session ID");
            return res.status(400).json({ message: "Session ID is required" });
        }

        const response = await fetch(`https://api.paymongo.com/v1/checkout_sessions/${sessionId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${toBase64(process.env.NEXT_PUBLIC_PM_API_KEY+':')}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            console.error("Failed to fetch checkout session:", response.statusText);
            return res.status(500).json({ message: "Failed to fetch session status" });
        }

        const responseData = await response.json() as { data?: any };
        console.log("Full PayMongo Response:", JSON.stringify(responseData, null, 2));

        // Extract the payment status
        const status = responseData?.data?.attributes?.payments?.[0]?.attributes?.status || "unknown";
        const userId = req.query.user_id;

        if (status !== "paid") {
            console.warn(`Payment not succeeded for session ${sessionId}, status: ${status}`);
            return res.status(200).json({ message: "Payment not yet completed", status });
        }

        if (!userId) {
            console.warn("No user ID provided.");
            return res.status(400).json({ message: "User ID is required to update tokens" });
        }

        const connection = await getDbConnection();
        const result: any = await connection.execute(
            "UPDATE Users SET Tokens = Tokens + ? WHERE UserID = ?",
            [100, userId]
        );
        await connection.end();

        if (result[0]?.changedRows === 0) {
            console.warn(`User ${userId} not found in DB.`);
            return res.status(404).json({ message: "User not found" });
        }

        console.log(`User ${userId} received 100 tokens`);
        return res.status(200).json({ message: "Tokens added successfully" });

    } catch (error) {
        console.error("Error in getTokenPurchaseCheckoutSessionStatus:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
  }
}

export default new TransactionController();