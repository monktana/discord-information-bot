import moment from 'moment';
import { ProcessStep } from './processStep.js';

export class AddStreamDate extends ProcessStep {

  async run(stream) {
    if (stream.link === this.context.days[0]?.firstStream) {
      this.currentDay = this.context.days.shift()
    }
    
    const [hours, minutes] = stream.time.split(':').map(value => Number(value));
    stream.date = moment(this.currentDay.day);
    stream.date.add(hours, 'h');
    stream.date.add(minutes, 'm');
    stream.date = stream.date.toISOString();

    delete stream.time;

    return stream
  }

  extendScope(scope, input) {
    scope.setContext('stream', input);
  }

  useContext(context) {
    this.context = context;
  }
}