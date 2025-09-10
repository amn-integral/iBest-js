import {addNumbers} from "@integralrsg/imath";

export const Results: React.FC = () => {
  return (
    <div>
      <h2>Results</h2>
      <p>Here are the results of your analysis:</p>
      {/* Render results here */}
      <p>2 + 3 = {addNumbers(2, 3)}</p>
    </div>
  );
};
