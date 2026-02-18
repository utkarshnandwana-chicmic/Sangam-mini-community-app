import { Pipe, PipeTransform } from '@angular/core';
import { environment } from '../../../environments/environment';

@Pipe({
  name: 'imageUrl',
  standalone: true
})
export class ImageUrlPipe implements PipeTransform {

  transform(path: string | null | undefined): string {

  if (!path) {
    return 'https://i.imgur.com/1XK6F4K.png'; 
  }

    return environment.cdnUrl + path;
  }
}
