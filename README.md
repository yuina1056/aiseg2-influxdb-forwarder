# aiseg2-influxdb

パナソニック製HEMS「スマートHEMS」のAiSEG2のWebインターフェースから各情報をスクレイピングしてinfluxdbに投入するツールです。

後述の通りすべての環境で動作を保証していないので自己責任です。

## 動作環境

このツールを使用するには、動作環境にて Node.js のインストール及び、Web操作が可能な AiSEG2端末が必要です。

下記環境で動作確認をしています。そのため、それ以外の環境の動作は保証できません。

- 実行環境
  - Ubuntu 22.04
  - Node.js 20.11.0
- AiSEG2
  - ファームウェア Ver.2.97I-01

## 機能概要

本ツールでは以下の機能をサポートしています。

- AiSEG2 から取得したメトリクスを指定の influxdb へ保存
- AiSEG2 から取得できる項目は以下のとおりです。
  - 消費電力の合計
  - 発電電力の合計
  - 売電電力（消費電力の合計と発電電力の合計の差）
  - スマートHEMSに設定された発電機器ごとの発電量（最大3つまで）
  - スマートHEMSに設定された区画ごとの消費電力
