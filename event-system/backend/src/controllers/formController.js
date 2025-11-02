import FormService from '../services/formService.js';
import response from '../utils/response.js';
import { ApiError } from '../utils/errors.js';

export class FormController {
  static create = async (req, res, next) => {
    try {
      const form = await FormService.createForm(req.body, req.user);
      return response.created(res, form);
    } catch (err) { next(err); }
  };

  static list = async (req, res, next) => {
    try {
      const forms = await FormService.listForms();
      return response.ok(res, forms);
    } catch (err) { next(err); }
  };

  static get = async (req, res, next) => {
    try {
      const form = await FormService.getForm(req.params.id);
      if (form.settings?.requiresLogin && !req.user) throw new ApiError('Auth required', 401);
      return response.ok(res, form);
    } catch (err) { next(err); }
  };

  static update = async (req, res, next) => {
    try {
      const form = await FormService.updateForm(req.params.id, req.body);
      return response.ok(res, form);
    } catch (err) { next(err); }
  };

  static remove = async (req, res, next) => {
    try {
      await FormService.deleteForm(req.params.id, req.user);
      return response.ok(res, {});
    } catch (err) { next(err); }
  };
}

export default FormController;




