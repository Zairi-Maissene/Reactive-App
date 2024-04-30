// generate sample loan model
import mongoose from 'mongoose';

export const LoanModel = mongoose.model('Loan', new mongoose.Schema({
  id: String,
  applicantName: String,
  applicantEmail: String,
  applicantPhone: String,
  loanAmount: Number,
  status: String,
  documents: [String],
}));