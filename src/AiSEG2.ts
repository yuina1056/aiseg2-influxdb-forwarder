import { JSDOM } from 'jsdom';
import DigestClient from 'digest-fetch';

export type PowerSummary = {
  totalGenerationPowerKW: MetricsElement;
  totalUsagePowerKW: MetricsElement;
  totalBalancePowerKW: MetricsElement;
  detailsGenerationPower: MetricsElement[];
  totalPurchasedPowerKW: MetricsElement;
};

export type DetailUsagePower = MetricsElement[];

export type UsagePowerSummary = {
  totalGenerationPowerKWh: MetricsElement;
  totalSoldPowerKWh: MetricsElement;
  totalPurchasedPowerKWh: MetricsElement;
  totalUsagePowerKWh: MetricsElement;
};

export type DetailUsagePowerSummary = MetricsElement[];

type MetricsElement = {
  name: string;
  value: number;
};

export class AiSEG2 {
  private readonly host: string;
  private readonly useHTTPS: boolean;
  private readonly client: DigestClient;

  constructor(host: string, user: string, password: string, useHTTPS = false) {
    if (host === '') {
      throw new AiSEG2Error('AiSEG2 のホストが指定されていません。');
    }
    if (user === '') {
      throw new AiSEG2Error('AiSEG2 のログインユーザー名が指定されていません。');
    }
    if (password === '') {
      throw new AiSEG2Error('AiSEG2 のログインパスワードが指定されていません。');
    }

    this.host = host;
    this.useHTTPS = useHTTPS;
    this.client = new DigestClient(user, password, { algorithm: 'MD5' });
  }

  private getNumericValue(input: string | null | undefined): number {
    if (input === undefined || input === null) return 0;

    const array = input.match(/[0-9]|\./g);
    if (array === null) return 0;
    return Number(array.join(''));
  }

  async getPowerSummary(): Promise<PowerSummary> {
    const response = await this.client.fetch(
      `${this.useHTTPS ? 'https' : 'http'}://${this.host}/page/electricflow/111`,
    );
    const body = await response.text();

    const dom = await new JSDOM(body);
    const document = dom.window.document;

    const totalGenerationPowerKW: MetricsElement = {
      name: '総発電電力(kW)',
      value: this.getNumericValue(document.getElementById('g_capacity')?.textContent),
    };
    const totalUsagePowerKW: MetricsElement = {
      name: '総消費電力(kW)',
      value: this.getNumericValue(document.getElementById('u_capacity')?.textContent),
    };
    const totalBalancePowerKW: MetricsElement = {
      name: '売買電力(kW)',
      value: totalGenerationPowerKW.value - totalUsagePowerKW.value,
    };
    const totalPurchasedPowerKW: MetricsElement = {
      name: '買電力(kW)',
      value:
        totalUsagePowerKW.value - totalGenerationPowerKW.value > 0
          ? totalUsagePowerKW.value - totalGenerationPowerKW.value
          : 0,
    };

    const detailsGenerationPower: MetricsElement[] = [];

    for (let index = 1; index <= 3; index++) {
      const generationPowerItemName = document.getElementById(`g_d_${index}_title`)?.textContent;
      if (generationPowerItemName !== '') {
        detailsGenerationPower.push({
          name: `${generationPowerItemName}(W)`,
          value: this.getNumericValue(
            document.getElementById(`g_d_${index}_capacity`)?.textContent,
          ),
        });
      }
    }

    return {
      totalGenerationPowerKW,
      totalUsagePowerKW,
      totalBalancePowerKW,
      detailsGenerationPower,
      totalPurchasedPowerKW,
    };
  }

  async getDetailsUsagePower(): Promise<DetailUsagePower> {
    let pageEndCheck: string = '';
    let pageCount = 1;
    const maxCount = 20;

    const usagePowerItems: MetricsElement[] = [];

    do {
      const response = await this.client.fetch(
        `${this.useHTTPS ? 'https' : 'http'}://${this.host}/page/electricflow/1113?id=${pageCount}`,
      );
      const body = await response.text();

      const dom = await new JSDOM(body);
      const document = dom.window.document;

      // 重複ページかどうかチェック
      const checkDuplicate: string[] = [];
      for (let index = 1; index <= 10; index++) {
        const name = document.querySelector(`#stage_${index} > div.c_device`)?.textContent;
        checkDuplicate.push(name ?? '');
      }
      if (pageEndCheck === checkDuplicate.join(',')) {
        break;
      }

      for (let index = 1; index <= 10; index++) {
        const name = document.querySelector(`#stage_${index} > div.c_device`)?.textContent;
        if (name === '' || name === null || name === undefined) {
          continue;
        }

        usagePowerItems.push({
          name: `${name}(W)`,
          value: this.getNumericValue(
            document.querySelector(`#stage_${index} > div.c_value`)?.textContent,
          ),
        });
      }
      pageEndCheck = checkDuplicate.join(',');
      pageCount++;
    } while (pageCount <= maxCount);

    return usagePowerItems;
  }

  async getUsagePowerSummary(): Promise<UsagePowerSummary> {
    // 発電量
    let response = await this.client.fetch(
      `${this.useHTTPS ? 'https' : 'http'}://${this.host}/page/graph/51111`,
    );
    let body = await response.text();

    let dom = await new JSDOM(body);
    let document = dom.window.document;

    const totalGenerationPowerKWh: MetricsElement = {
      name: '総発電電力(kWh)',
      value: this.getNumericValue(document.getElementById('val_kwh')?.textContent),
    };

    // 売電量
    response = await this.client.fetch(
      `${this.useHTTPS ? 'https' : 'http'}://${this.host}/page/graph/54111`,
    );
    body = await response.text();

    dom = await new JSDOM(body);
    document = dom.window.document;

    const totalSoldPowerKWh: MetricsElement = {
      name: '売電量(kWh)',
      value: this.getNumericValue(document.getElementById('val_kwh')?.textContent),
    };

    // 買電量
    response = await this.client.fetch(
      `${this.useHTTPS ? 'https' : 'http'}://${this.host}/page/graph/53111`,
    );
    body = await response.text();

    dom = await new JSDOM(body);
    document = dom.window.document;

    const totalPurchasedPowerKWh: MetricsElement = {
      name: '買電量(kWh)',
      value: this.getNumericValue(document.getElementById('val_kwh')?.textContent),
    };

    // 使用電力量
    response = await this.client.fetch(
      `${this.useHTTPS ? 'https' : 'http'}://${this.host}/page/graph/52111`,
    );
    body = await response.text();

    dom = await new JSDOM(body);
    document = dom.window.document;

    const totalUsagePowerKWh: MetricsElement = {
      name: '総消費電力(kWh)',
      value: this.getNumericValue(document.getElementById('val_kwh')?.textContent),
    };

    return {
      totalGenerationPowerKWh,
      totalSoldPowerKWh,
      totalPurchasedPowerKWh,
      totalUsagePowerKWh,
    };
  }

  async getDetailsUsagePowerSummary(): Promise<DetailUsagePowerSummary> {
    const usagePowerSummaryItems: MetricsElement[] = [];
    const response = await this.client.fetch(
      `${this.useHTTPS ? 'https' : 'http'}://${this.host}/page/setting/installation/734`,
    );
    const body = await response.text();

    const dom = new JSDOM(body);
    const document = dom.window.document;

    const scriptElements = Array.from(document.querySelectorAll('script')).filter((script) =>
      script.textContent?.includes('window.onload'),
    );

    for (const element of scriptElements) {
      const scriptContent = element.textContent || '';
      const index = scriptContent.indexOf('(') + 1;
      const rindex = scriptContent.lastIndexOf(')');
      const jsonText = scriptContent.substring(index, rindex);
      const jsonDict = JSON.parse(jsonText);

      for (const circuit of jsonDict['arrayCircuitNameList']) {
        if (circuit['strBtnType'] != '1') {
          continue;
        }
        const paramsDict = { circuitid: circuit['strId'] };
        const circuitResponse = await this.client.fetch(
          `${this.useHTTPS ? 'https' : 'http'}://${this.host}/page/graph/584?data=${Buffer.from(JSON.stringify(paramsDict)).toString('base64')}`,
        );
        const circuitBody = await circuitResponse.text();

        const circuitDom = new JSDOM(circuitBody);
        const circuitDocument = circuitDom.window.document;

        usagePowerSummaryItems.push({
          name: `${circuit['strCircuit']}(kWh)`,
          value: this.getNumericValue(circuitDocument.querySelector('#val_kwh')?.textContent),
        });
      }
    }

    return usagePowerSummaryItems;
  }
}

class AiSEG2Error extends Error {
  static {
    this.prototype.name = 'AiSEG2Error';
  }
}
