export interface ApiResponse<T> {
  statusCode: number;
  status: boolean;
  message: string;
  type: string;
  data: T;
}
