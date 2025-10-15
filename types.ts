export enum JobStatus {
  WAITING = 'Chờ',
  PROCESSING = 'Đang làm',
  COMPLETED = 'Hoàn tất',
  ERROR = 'Lỗi',
}

export interface JobOutput {
  content: string;
  sale: string;
  videoPrompt: string;
  thumbnail: string; // Base64 encoded image
}

export interface Job {
  id: string;
  title: string;
  videoCode: string;
  youtubeLink?: string;
  userScript: string;
  status: JobStatus;
  progress: number;
  progressMessage: string;
  output?: JobOutput;
  error?: string;
}

export interface PromptConfig {
  outline: string;
  intro: string;
  content: string;
  seo: string;
  videoPrompt: string;
}

export enum AccountStatus {
  UNCHECKED = 'Chưa kiểm tra',
  VALID = 'Hoạt động',
  INVALID = 'Không hoạt động',
  CHECKING = 'Đang kiểm tra...',
}

export interface Account {
  id: string;
  key: string;
  status: AccountStatus;
}

export interface OtherAPI {
    id: string;
    key: string;
}

export interface AppConfig {
    prompts: PromptConfig;
    accounts: Account[];
    otherApis: OtherAPI[];
}
