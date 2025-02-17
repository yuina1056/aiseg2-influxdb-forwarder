import { InfluxDB, WriteApi, Point } from '@influxdata/influxdb-client';
import { PowerSummary, DetailUsagePower, UsagePowerSummary, DetailUsagePowerSummary } from './AiSEG2';

export class Influx {
  private readonly writeClient: WriteApi;
  constructor(host: string, token: string, orgName: string, bucketName: string, useHTTPS: boolean) {
    const url = `${useHTTPS ? 'https' : 'http'}://${host}`;

    const client = new InfluxDB({ url, token });
    this.writeClient = client.getWriteApi(orgName, bucketName, 'ns');
  }

  public writePower(powerSummary: PowerSummary, detailsUsagePower: DetailUsagePower, usagePowerSummary: UsagePowerSummary, detailsUsagePowerSummary: DetailUsagePowerSummary) {
    const totalGenerationPowerPoint = new Point('power')
      .tag('summary', powerSummary.totalGenerationPowerKW.name)
      .floatField('value', powerSummary.totalGenerationPowerKW.value);
    const totalUsagePowerPoint = new Point('power')
      .tag('summary', powerSummary.totalUsagePowerKW.name)
      .floatField('value', powerSummary.totalUsagePowerKW.value);
    const totalBalancePowerPoint = new Point('power')
      .tag('summary', powerSummary.totalBalancePowerKW.name)
      .floatField('value', powerSummary.totalBalancePowerKW.value);
    const totalPurchasedPowerPoint = new Point('power')
      .tag('summary', powerSummary.totalPurchasedPowerKW.name)
      .floatField('value', powerSummary.totalPurchasedPowerKW.value);

    this.writeClient.writePoint(totalGenerationPowerPoint);
    this.writeClient.writePoint(totalUsagePowerPoint);
    this.writeClient.writePoint(totalBalancePowerPoint);
    this.writeClient.writePoint(totalPurchasedPowerPoint);

    const totalGenerationPowerKWhPoint = new Point('power')
      .tag('summary', usagePowerSummary.totalGenerationPowerKWh.name)
      .floatField('value', usagePowerSummary.totalGenerationPowerKWh.value);
    const totalSoldPowerKWhPoint = new Point('power')
      .tag('summary', usagePowerSummary.totalSoldPowerKWh.name)
      .floatField('value', usagePowerSummary.totalSoldPowerKWh.value);
    const totalPurchasedPowerKWhPoint = new Point('power')
      .tag('summary', usagePowerSummary.totalPurchasedPowerKWh.name)
      .floatField('value', usagePowerSummary.totalPurchasedPowerKWh.value);
    const totalUsagePowerKWhPoint = new Point('power')
      .tag('summary', usagePowerSummary.totalUsagePowerKWh.name)
      .floatField('value', usagePowerSummary.totalUsagePowerKWh.value);

    this.writeClient.writePoint(totalGenerationPowerKWhPoint);
    this.writeClient.writePoint(totalSoldPowerKWhPoint);
    this.writeClient.writePoint(totalPurchasedPowerKWhPoint);
    this.writeClient.writePoint(totalUsagePowerKWhPoint);

    powerSummary.detailsGenerationPower.forEach((item) => {
      const itemPoint = new Point('power')
        .tag('detail-type', 'generation')
        .tag('detail-section', item.name)
        .floatField('value', item.value);
      this.writeClient.writePoint(itemPoint);
    });

    detailsUsagePower.forEach((item) => {
      const itemPoint = new Point('power')
        .tag('detail-type', 'usage')
        .tag('detail-section', item.name)
        .floatField('value', item.value);
      this.writeClient.writePoint(itemPoint);
    });

    detailsUsagePowerSummary.forEach((item) => {
      const itemPoint = new Point('power')
        .tag('detail-type', 'usage-summary')
        .tag('detail-section', item.name)
        .floatField('value', item.value);
      this.writeClient.writePoint(itemPoint);
    });

    this.writeClient.close().then(() => {
      console.log('WRITE FINISHED');
    });
  }
}
