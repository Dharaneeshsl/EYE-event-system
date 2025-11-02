export const ok = (res, data, message) => res.status(200).json({ success: true, message, data });
export const created = (res, data, message) => res.status(201).json({ success: true, message, data });
export const noContent = (res) => res.status(204).send();

export default { ok, created, noContent };




