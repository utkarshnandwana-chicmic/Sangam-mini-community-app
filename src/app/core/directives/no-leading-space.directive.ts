import { Directive, ElementRef, HostListener, inject } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: 'input[appNoLeadingSpace], textarea[appNoLeadingSpace]',
  standalone: true
})
export class NoLeadingSpaceDirective {
  private elementRef = inject(ElementRef<HTMLInputElement | HTMLTextAreaElement>);
  private ngControl = inject(NgControl, { optional: true, self: true });

@HostListener('keydown', ['$event'])
onKeyDown(event: Event): void {
  const keyboardEvent = event as KeyboardEvent;

  const input = this.elementRef.nativeElement as HTMLInputElement;
  const cursorAtStart = (input.selectionStart ?? 0) === 0;

  if (keyboardEvent.key === ' ' && cursorAtStart && !input.value) {
    keyboardEvent.preventDefault();
  }
}

  @HostListener('input')
  onInput(): void {
    const input = this.elementRef.nativeElement;
    const trimmed = input.value.replace(/^\s+/, '');
    if (trimmed === input.value) {
      return;
    }

    input.value = trimmed;
    this.ngControl?.control?.setValue(trimmed, { emitEvent: false });
  }
}
