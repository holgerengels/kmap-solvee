import { html, TemplateResult } from 'lit';
import '../src/kmap-solvee.js';

export default {
  title: 'KmapSolveTree',
  component: 'kmap-solvee',
  argTypes: {
    textColor: { control: 'color' },
    backgroundColor: { control: 'color' },
    borderColor: { control: 'color' },
  },
};

interface Story<T> {
  (args: T): TemplateResult;
  args?: Partial<T>;
  argTypes?: Record<string, unknown>;
}

interface ArgTypes {
  textColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  slot?: TemplateResult;
}

const Template: Story<ArgTypes> = ({
  textColor,
  backgroundColor,
  borderColor,
  slot,
}: ArgTypes) => html`
  <kmap-solvee
    style="--kmap-solvee-text-color: ${textColor || 'black'} --kmap-solvee-background-color: ${backgroundColor || 'black'} --kmap-solvee-border-color: ${borderColor || 'black'}"
  >
    ${slot}
    <kmap-solvee>
      <action gain="start">
        <step>\`2x^2- 4x = 6\`</step>
        <action gain="dead end">
          <label>\`x\` ausklammern</label>
          <step>\`x(2x-4) = 6\`</step>
          <comment>Faktorisieren hilft nur, wenn auf der rechten Seite \`0\` steht, sodass der Satz vom Nullprodukt
            angewandt werden kann
          </comment>
        </action>
        <action gain="wrong">
          <label>Durch \`x\` teilen</label>
          <step>\`x - 4 = 6/x\`</step>
          <comment>Fehler: Teilen durch \`x\` ist keine Äquivalenzumformung</comment>
        </action>
        <action gain="wrong">
          <label>Mitternachtsformel</label>
          <step>\`a= .., b= .., c = ???\`</step>
          <comment>Fehler: Um die Mitternachtsformel anwenden zu können, muss die Gleichung zunächst in die Nullform
            gebracht werden
          </comment>
        </action>
        <action gain="positive">
          <label>Auf beiden Seiten 6 subtrahieren</label>
          <step>\`2x^2- 4x - 6 = 0\`</step>
          <action gain="finish" best>
            <label>Mitternachtsformel</label>
            <step>\`x_1 = -1; x_2 = 3\`</step>
            <comment>Schnellster Lösungsweg</comment>
          </action>
        </action>
      </action>
    </kmap-solvee>
  </kmap-solvee>
`;

export const Regular = Template.bind({});

export const SlottedContent = Template.bind({});
SlottedContent.args = {
  slot: html`
    <action gain="start" done>
      <step>\`(x-2)^2=0\`</step>
      <action gain="negative" done>
        <label>Ausmultiplizieren</label>
        <step>\`x^2 - 4x + 4 = 0\`</step>
        <action gain="finish" done>
          <label>Mitternachtsformel</label>
          <step>\`x_(1,2) = 2\`</step>
        </action>
      </action>
      <action gain="finish">
        <label>Satz vom Nullprodukt</label>
        <step>\`x - 2 = 0 => x = 2\`</step>
      </action>
    </action>
  `,
};
SlottedContent.argTypes = {
  slot: { table: { disable: true } },
};
