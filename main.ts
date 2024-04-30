// Express.js setup
const express = require('express');
const amqp = require('amqplib/callback_api');
import mongoose from 'mongoose';
import { CommercialService } from './services/commercial.service';
import { CreditService } from './services/credit.service';
import ocrService from './services/ocr.service';
import { RiskManagementService } from './services/risk-management.service';
const app = express();
app.use(express.json());
const port = 3000;

// RabbitMQ setup
const rabbitMQUrl = 'amqp://localhost';

// MongoDB setup
mongoose.connect('mongodb://localhost/loan_management');

// Express routes
app.post('/applyLoan', async (req, res) => {
  // Handle loan application form and documents
  const loanData = req.body; // Assuming loan data is sent in the request body
  // Send loan documents to File Management Service via RabbitMQ
  sendToQueue('microservicesQueue', 'commercialService', JSON.stringify(loanData));
  // Wait for the final response from the Response Service
  const finalResponse = await waitForFinalResponse();

  res.send(finalResponse);
});

function waitForFinalResponse(): Promise<string> {
  return new Promise((resolve, reject) => {
    // Response Service listens for messages from Credit Service
    receiveFromQueue('clientQueue', function (message) {
      const { fields: {routingKey: topic}, content } =  message
      const data = content.toString()
      if (topic === 'response') {
        console.log('Received response from Credit Service:', data);
        resolve(data);
      }
    });
  });
}

// RabbitMQ sender function
function sendToQueue(queue, topic, message) {
  amqp.connect(rabbitMQUrl, function (error0, connection) {
    if (error0) throw error0;
    connection.createChannel(function (error1, channel) {
      if (error1) throw error1;
      channel.assertExchange(queue, 'topic', { durable: false });
      channel.publish(queue, topic, Buffer.from(message));
    });
    setTimeout(function () {
      connection.close();
    }, 500);
  });
}

// RabbitMQ receiver function
function receiveFromQueue(queue, callback) {
  amqp.connect(rabbitMQUrl, function (error0, connection) {
    if (error0) throw error0;
    connection.createChannel(function (error1, channel) {
      if (error1) throw error1;
      channel.assertExchange(queue, 'topic', { durable: false });
      channel.assertQueue('', { exclusive: true }, function (error2, q) {
        if (error2) throw error2;
        channel.bindQueue(q.queue, queue, '#');
        channel.consume(q.queue, function (msg) {
          callback(msg);
        }, {
          noAck: true
        });
      });
    });
  });
}



// Step 3: Microservices process data and notify each other
receiveFromQueue('microservicesQueue', async function (message) {
  const { fields, content } = message
  const topic = fields.routingKey;
  const data = content.toString()
  if (topic === 'commercialService') {
    console.log('Commerce Service Received event:', data);
    const commercialService = new CommercialService();
    await commercialService.processFile(data);
    sendToQueue('microservicesQueue', 'ocr', 'Commerce service documents sent');
  } else if (topic === 'ocr') {
    console.log('Received data for OCR processing:', data);
    // Simulate OCR processing with a delay (for demonstration purposes)
    await ocrService.simulateOCRProcessing()
      // Send OCR result to OCR Result queue with appropriate topic
    const service = data.includes('Commerce') ? 'Commerce' : 'Risk';
    sendToQueue('microservicesQueue', 'ocrResult', service + 'OCR processing completed');

  } else if (topic === 'ocrResult') {
    console.log('Received OCR result:', data);
    if (data.includes('Commerce')) {
      // If OCR result is from Commerce Service, notify Risk Management Service
      const commercialService = new CommercialService();
      const score = await commercialService.getScore(data);
      sendToQueue('microservicesQueue', 'riskManagement', score.toString());
    } else if (data.includes('Risk')) {
      // If OCR result is from Risk Management Service, notify Credit Service
      const riskManagementService = new RiskManagementService();
      const riskScore = await riskManagementService.processRisk(data);
      if (riskScore < 50) {
        sendToQueue('clientQueue', 'response', 'Loan application rejected');
      } else {
        sendToQueue('clientQueue', 'response', 'Loan application approved');
      }
      sendToQueue('microservicesQueue', 'credit', 'Risk management finished processing');
    }
  } else if (topic === 'riskManagement') {
    console.log('Risk Management Service Received event:', data);
    // Risk Management Service processes data
    // Once processing is complete, notify Credit Service
    sendToQueue('microservicesQueue', 'ocr', 'Risk management service documents sent');
  } else if (topic === 'credit') {
    console.log('Received event for Credit Service:', data);
    const creditService = new CreditService();
    await creditService.createCreditReport();
  }
});

// Start Express server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
