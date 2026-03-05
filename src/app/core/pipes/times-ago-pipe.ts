import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'timesAgo',
  pure: false // Set to false if the value may change over time
})
export class TimesAgoPipe implements PipeTransform {

  transform(value: Date | string | number): string {
    if (!value) return '';

    const now = new Date();
    const date = new Date(value);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 29) return 'Just now';

    const intervals: { [key: string]: number } = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60,
      second: 1
    };

    for (const i in intervals) {
      const interval = Math.floor(seconds / intervals[i]);
      if (interval >= 1) {
        return interval === 1 ? `${interval} ${i} ago` : `${interval} ${i}s ago`;
      }
    }
    return '';
  }
}