export interface Template {
    id: string;
    title: string;
    description: string | null;
    s3_link: string;
    config: Record<string, any>;
    created_at: Date;
    updated_at: Date;
}
export declare class TemplateRepository {
    /**
     * Find a template by its unique ID
     */
    static findById(id: string): Promise<Template | null>;
    /**
     * Get all available templates
     */
    static findAll(): Promise<Template[]>;
    /**
     * Create a new template
     */
    static create(templateData: {
        title: string;
        description?: string;
        s3_link: string;
        config?: Record<string, any>;
    }): Promise<Template>;
    /**
     * Update an existing template
     */
    static update(id: string, updates: {
        title?: string;
        description?: string;
        s3_link?: string;
        config?: Record<string, any>;
    }): Promise<Template | null>;
    /**
     * Delete a template by ID
     */
    static delete(id: string): Promise<boolean>;
}
//# sourceMappingURL=template-repository.d.ts.map