import { Pipe, PipeTransform } from '@angular/core';
import { environment } from '../../../environments/environment';

@Pipe({
  name: 'imageUrl',
  standalone: true
})
export class ImageUrlPipe implements PipeTransform {

  transform(value: string | null | undefined): string {

    if (!value) return '';

    // ✅ If already full URL → return as is
    if (value.startsWith('http://') || value.startsWith('https://')) {
      return value;
    }

    // ✅ Otherwise treat as filePath
    return environment.cdnUrl + value;
  }
}