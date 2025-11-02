import mongoose from 'mongoose';
import Form from '../models/Form.js';
import Response from '../models/Response.js';
import { ApiError } from '../utils/errors.js';

export class FormService {
  static mapIncomingQuestions(incoming) {
    const elements = Array.isArray(incoming.questions) && incoming.questions.length > 0 && incoming.questions[0]?.type
      ? incoming.questions
      : Array.isArray(incoming.pages?.[0]?.elements)
        ? incoming.pages[0].elements
        : incoming.questions;

    const typeMap = {
      text: 'text',
      comment: 'textarea',
      radiogroup: 'radio',
      checkbox: 'checkbox',
      dropdown: 'dropdown',
      rating: 'rating',
      scale: 'scale',
      date: 'date',
      email: 'email'
    };

    const questions = Array.isArray(elements)
      ? elements.map((el, idx) => ({
          qId: el.name || `q_${idx + 1}`,
          type: typeMap[el.type] || 'text',
          text: el.title || el.text || `Question ${idx + 1}`,
          desc: el.description,
          req: Boolean(el.isRequired),
          opts: Array.isArray(el.choices)
            ? el.choices.map((c, i) =>
                typeof c === 'string'
                  ? { val: String(i + 1), lbl: c }
                  : { val: String(c.value ?? i + 1), lbl: String(c.text ?? c.label ?? '') }
              )
            : []
        }))
      : [];

    return questions;
  }

  static async createForm(incoming, user) {
    const questions = this.mapIncomingQuestions(incoming);

    const payload = {
      title: incoming.title,
      description: incoming.description,
      settings: incoming.settings,
      isPublished: incoming.isPublished === true,
      questions,
      ...(user?.id ? { createdBy: user.id } : {})
    };

    return Form.create(payload);
  }

  static async listForms() {
    return Form.find().select('title createdAt responseCount').sort('-createdAt');
  }

  static async getForm(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) throw new ApiError('Invalid form id', 400);
    const form = await Form.findById(id).select('-settings.redirectUrl');
    if (!form) throw new ApiError('Form not found', 404);
    return form;
  }

  static async updateForm(id, update) {
    const form = await Form.findByIdAndUpdate(id, { ...update }, { new: true, runValidators: true });
    if (!form) throw new ApiError('Form not found', 404);
    return form;
  }

  static async deleteForm(id, user) {
    if (!mongoose.Types.ObjectId.isValid(id)) throw new ApiError('Invalid form id', 400);
    const form = await Form.findById(id);
    if (!form) throw new ApiError('Form not found', 404);

    const isOwner = user && form.createdBy && String(form.createdBy) === String(user.id);
    const legacyNoOwner = !form.createdBy;
    const admin = user && user.role === 'admin';
    if (!isOwner && !legacyNoOwner && !admin) throw new ApiError('Not authorized to delete this form', 403);

    await Promise.allSettled([
      Response.deleteMany({ formId: form._id }),
      form.deleteOne()
    ]);
    return true;
  }
}

export default FormService;




