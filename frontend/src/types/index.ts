export interface Category {
  id: number;
  name: string;
  media_type: 'audio' | 'video' | 'image' | 'text';
  created_at: string;
}

export interface MediaFile {
  id: number;
  filename: string;
  file_path: string;
  media_type: 'audio' | 'video' | 'image' | 'text';
  mime_type: string;
  uploaded_at: string;
  categories: Category[];
}

export interface Test {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  status: 'open' | 'closed';
  created_by?: string;
  loop_media: boolean;
}

export interface TestUser {
  id: number;
  test_id: number;
  email: string;
  one_time_token: string;
  accessed_at: string | null;
  completed_at: string | null;
}

export interface Admin {
  id: number;
  username: string;
  is_super_admin: boolean;
  created_at: string;
}

export interface Rating {
  id: number;
  test_user_id: number;
  media_file_id: number;
  stars: number;
  comment: string | null;
  rated_at: string;
}

export interface TestUserResponse {
  email: string;
  link: string;
}

export interface TestDetailsResponse {
  test: Test;
  media_files: MediaFile[];
}

export interface RatingWithUser {
  rating: Rating;
  user_email: string;
  media_file: MediaFile;
}

export interface MediaFileStats {
  media_file: MediaFile;
  average_stars: number;
  total_ratings: number;
}

export interface TestResultsResponse {
  test: Test;
  aggregated: MediaFileStats[];
  individual: RatingWithUser[];
}

export interface LoginResponse {
  token: string;
  is_super_admin: boolean;
  password_must_change: boolean;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface ActivityLog {
  id: number;
  admin_username: string | null;
  user_email: string | null;
  action: string;
  entity_type: string | null;
  entity_id: number | null;
  details: string | null;
  ip_address: string | null;
  user_agent: string | null;
  timestamp: string;
}

export interface ActivityLogResponse {
  logs: ActivityLog[];
  total: number;
  limit: number;
  offset: number;
}
