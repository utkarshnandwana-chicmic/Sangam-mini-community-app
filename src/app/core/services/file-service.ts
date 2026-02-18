import { Injectable } from '@angular/core';
import { ApiService } from './api';
import { API_ENDPOINTS } from '../../constants/api-endpoints';

@Injectable({
  providedIn: 'root'
})
export class FileService {

  constructor(private api: ApiService) {}

  upload(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    return this.api.post<any>(
      API_ENDPOINTS.FILE.UPLOAD,
      formData
    );
  }
}
