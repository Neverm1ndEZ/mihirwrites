import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISubscriber extends Document {
  email: string;
  createdAt: Date;
}

const SubscriberSchema = new Schema<ISubscriber>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  },
  { timestamps: true }
);

const Subscriber: Model<ISubscriber> =
  mongoose.models.Subscriber || mongoose.model<ISubscriber>("Subscriber", SubscriberSchema);

export default Subscriber;
