export function createUser(name: string) { return { name }; }
export function deleteUser(id: string) { return id; }
const handlers = { create: createUser, delete: deleteUser };
export function dispatch(cmd: keyof typeof handlers, arg: string) { return handlers[cmd](arg); }
