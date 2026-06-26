export interface User {
    id: string;
    email: string;
    name: string | null;
    created_at: Date;
    updated_at: Date;
}
export declare class UserRepository {
    /**
     * Find a user by their unique ID
     */
    static findById(id: string): Promise<User | null>;
    /**
     * Find a user by their unique email address
     */
    static findByEmail(email: string): Promise<User | null>;
    /**
     * Create a new user
     */
    static create(userData: {
        email: string;
        name?: string;
    }): Promise<User>;
    /**
     * Update an existing user's details
     */
    static update(id: string, updates: {
        email?: string;
        name?: string;
    }): Promise<User | null>;
    /**
     * Delete a user by ID
     */
    static delete(id: string): Promise<boolean>;
}
//# sourceMappingURL=user-repository.d.ts.map