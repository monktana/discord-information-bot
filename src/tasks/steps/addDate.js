import moment from 'moment';
import ProcessStep from './processStep';

export default class AddStreamDate extends ProcessStep {
  async run(stream) {
    const streamWithDate = stream;

    if (stream.link === this.context.days[0]?.firstStream) {
      this.currentDay = this.context.days.shift();
    }

    const [hours, minutes] = stream.time.split(':').map((value) => Number(value));
    streamWithDate.date = moment(this.currentDay.day);
    streamWithDate.date.add(hours, 'h');
    streamWithDate.date.add(minutes, 'm');
    streamWithDate.date = streamWithDate.date.toISOString();

    delete streamWithDate.time;

    return streamWithDate;
  }

  extendScope(scope, input) {
    scope.setContext('stream', input);
  }

  useContext(context) {
    this.context = context;
  }
}
