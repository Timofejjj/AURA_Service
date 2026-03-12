export interface ErrorResponse {
    error: string;
}

// --- Auth ---

export interface RegisterRequest {
    username: string;
    email: string;
    password: string;
}

export interface RegisterResponse {
    user_id: number;
    username: string;
    email: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    user_id: number;
    username: string;
    access_token: string;
    refresh_token: string;
}

export interface RefreshRequest {
    refresh_token: string;
}

export interface RefreshResponse {
    access_token: string;
    refresh_token: string;
}

export interface LogoutRequest {
    refresh_token: string;
}

export interface LogoutResponse {
    status: string;
}

// --- AI Settings ---

export interface AIPromptsSettings {
    user_id: number;
    words_for_prompt: string | null;
}

export interface UpsertAISettingsRequest {
    words_for_prompt: string;
}

export interface DeleteAISettingsResponse {
    message: string;
}

// --- Reports ---

export interface Report {
    id: number;
    user_id: number;
    log_datetime: string; // ISO Date
    report: string;
}

// --- Thoughts ---

export interface Thought {
    thought_id: number;
    user_id: number;
    created_at: string;
    submitted_at?: string | null;
    content: string;
    voice_id?: string | null;
    sentiment_label?: string | null;
    sentiment_score?: number | null;
    image_id?: string | null;
    type_thought?: string | null;
}

export interface CreateThoughtReq {
    user_id: number;
    content: string;
}

export interface UpdateThoughtReq {
    thought_id: number;
    content: string;
    voice_id?: string | null;
    submitted_at?: string | null;
    sentiment_label?: string | null;
    sentiment_score?: number | null;
    image_id?: string | null;
    type_thought?: string | null;
}

// --- Work Sessions ---

export interface WorkSession {
    session_id: number;
    user_id: number;
    work_type?: string | null;
    start_time: string;
    end_time?: string | null;
    duration_minutes?: number | null;
    pre_session_text?: string | null;
    post_session_text?: string | null;
}

export interface CreateWorkSessionReq {
    user_id: number;
    session_id?: number;
    work_type?: string | null;
    start_time: string;
    pre_session_text?: string | null;
}

export interface CreateWorkSessionResp {
    session_id: number;
    user_id: number;
    work_type?: string | null;
    start_time: string;
    pre_session_text?: string | null;
}

export interface EndWorkSessionReq {
    post_session_text?: string | null;
}

// --- Breaks ---

export interface BreakSession {
    break_id: number;
    user_id: number;
    after_work_session_id?: number | null;
    start_time: string;
    end_time?: string | null;
    duration_minutes?: number | null;
    over_time_rest?: string | null;
    post_break_motivation?: string | null;
}

export interface StartBreakReq {
    user_id: number;
    after_work_session_id?: number | null;
    start_time: string;
}

export interface StartBreakResp {
    break_id: number;
    user_id: number;
    after_work_session_id: number;
    start_time: string;
    over_time_rest: boolean;
}

export interface EndBreakReq {
    post_break_motivation?: string | null;
}

// --- Common ---
export interface PaginationParams {
    limit?: number;
    offset?: number;
    user_id?: number;
}