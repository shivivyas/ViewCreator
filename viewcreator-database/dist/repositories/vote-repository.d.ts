export interface TemplateWithVotes {
    id: string;
    title: string;
    description: string | null;
    s3_link: string;
    media_type: 'image' | 'video';
    config: Record<string, any>;
    user_id: string | null;
    created_at: Date;
    updated_at: Date;
    upvotes: number;
    user_upvoted: boolean;
    is_saved: boolean;
}
export declare class VoteRepository {
    /**
     * Toggle an upvote for a template. If the user already upvoted, removes it.
     */
    static toggleUpvote(templateId: string, userId: string): Promise<{
        upvoted: boolean;
    }>;
    /**
     * Get all templates with upvote counts, save status, and pagination.
     * @param savedOnly When true, only returns templates saved by the current user.
     */
    static findAllWithVotes(currentUserId?: string, limit?: number, offset?: number, savedOnly?: boolean): Promise<TemplateWithVotes[]>;
    /**
     * Get a single template with upvote count, save status, and whether the current user upvoted.
     */
    static findByIdWithVotes(templateId: string, currentUserId?: string): Promise<TemplateWithVotes | null>;
    /**
     * Get unique category tags from templates visible to the current user.
     * Guests only see tags from public templates (user_id IS NULL).
     * Signed-in users see tags from public + their own templates.
     */
    static findCategories(currentUserId?: string): Promise<string[]>;
}
//# sourceMappingURL=vote-repository.d.ts.map