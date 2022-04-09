import * as Sentry from '@sentry/node';

export class ProcessStep {
  async process(input) {
    const scope = Sentry.getCurrentHub().pushScope();
    scope.setTag('step', this.constructor.name);
    
    this.extendScope?.(scope, input);
    const result = this.run(input);

    Sentry.getCurrentHub().popScope();

    return result;
  }
}