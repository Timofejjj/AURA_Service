// Type definitions for the frontend application

export interface UserProfile {
  id: number;
  firstName: string;
  lastName: string;
}

export interface JournalFolder {
  id: string;
  title: string;
  count: number;
  color_hex: string;
}

export interface Thought {
  thought_id?: number;
  ThoughtID?: number;
  id?: number;
  user_id?: number;
  content: string;
  title?: string; // Separate title field
  date?: string;
  sentiment_label?: string | null;
  sentiment_score?: number | null;
  type_thought?: string | null;
  image_id?: string | null;
  voice_id?: string | null;
  created_at?: string;
  submitted_at?: string | null;
}

export interface EnergyResponse {
  status: string;
  energy_level: number;
}

export interface FoldersResponse {
  folders: JournalFolder[];
}

export interface WeeklyReportResponse {
  status: string;
  has_new_report: boolean;
  report_metadata?: WeeklyReportMetadata;
}

export interface WeeklyReportMetadata {
  report_id: number;
  created_at: string;
  title: string;
}

export interface WeeklyReportData {
  report_id: number;
  title: string;
  period_string: string;
  content: string;
}

export interface WeeklyReportDetailsResponse {
  status: string;
  report_data: WeeklyReportData;
}

export interface SaveThoughtResponse {
  status: string;
  message: string;
  thought_id: number;
}

export interface UploadVoiceResponse {
  status: string;
  thought_id: number;
  transcribed_text: string;
  text?: string;
}

export interface UploadImageResponse {
  status: string;
  image_url: string;
  image_id?: string;
}

export interface FolderDetailsResponse {
  status: string;
  folder_info: {
    id: string;
    title: string;
    color_hex: string;
  };
  timeline: Array<{
    year: number;
    months: Array<{
      month_name: string;
      month_number: number;
      has_photos: boolean;
      photos: Array<{
        photo_id: string;
        url: string;
      }>;
      thoughts: Array<{
        thought_id: number;
        title: string;
        preview_text: string;
        date_str: string;
        sentiment_label: string;
        sentiment_color: string;
      }>;
    }>;
  }>;
}

export interface RegistrationPayload {
  username?: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  status: string;
  message: string;
}

export interface LoginPayload {
  email?: string;
  username?: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  username?: string;
  user_id?: number;
}

export interface OnboardingPayload {
  user_id: number;
  words_for_prompt: string;
}

export interface OnboardingResponse {
  status: string;
  message: string;
  user_id: number;
}

export interface SaveThoughtPayload {
  thought_id?: number;
  user_id?: number;
  content: string;
  /** Дата записи "YYYY-MM-DD" — при создании из экрана конкретного дня (DayDetailView) */
  date?: string;
  title?: string; // Separate title field
  image_id?: string;
  voice_id?: string;
  type_thought?: string; // Preserve type_thought when updating
}

export interface AppData {
  user: UserProfile | null;
  loading: boolean;
}

