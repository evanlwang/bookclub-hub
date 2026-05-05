// Re-export from factories (fixtures are deprecated, use factories directly)
export { createUser as createTestUser, insertUser, insertAllUsers, alice, bob, carol, dave, eve, frank, allUsers } from "../factories/users";
export type { TestUser } from "../factories/users";
