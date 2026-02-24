import { Injectable } from '@angular/core';
import { ApiService } from './api';
import { API_ENDPOINTS } from '../../constants/api-endpoints';
import { Observable } from 'rxjs';

export interface UploadedFile {
  filePath: string;
  fileUrl: string;
}

@Injectable({
  providedIn: 'root'
})
export class FileService {

  constructor(private api: ApiService) {}

  // ✅ Single upload (Used for profile image)
  upload(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);

    return this.api.post(
      API_ENDPOINTS.FILE.UPLOAD,
      formData
    );
  }

  // ✅ Multiple upload (Used for Add Post)
  uploadMany(files: File[]): Observable<any> {
    const formData = new FormData();

    files.forEach(file => {
      formData.append('fileArray', file);
    });

    return this.api.post(
      API_ENDPOINTS.FILE.UPLOAD_MANY,
      formData
    );
  }
}
