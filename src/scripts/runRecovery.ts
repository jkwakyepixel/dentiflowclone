import { fixMissingPayments } from '../services/recoverPayments';

fixMissingPayments().then(() => {
  console.log("Done!");
  process.exit(0);
}).catch(console.error);
