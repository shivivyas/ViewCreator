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
}
export declare class VoteRepository {
    /**
     * Toggle an upvote for a template. If the user already upvoted, removes it.
     */
    static toggleUpvote(templateId: string, userId: string): Promise<{
        upvoted: boolean;
    }>;
    /**
     * Get all templates with upvote counts and whether the current user upvoted.
     */
    static findAllWithVotes(currentUserId?: string): Promise<TemplateWithVotes[]>;
    /**
     * Get a single template with upvote count and whether the current user upvoted.
     */
    static findByIdWithVotes(templateId: string, currentUserId?: string): Promise<TemplateWithVotes | null>;
}
//# sourceMappingURL=vote-repository.d.ts.map