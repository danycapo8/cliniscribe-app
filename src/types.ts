import React from 'react';

export interface BaseProps {
  className?: string;
  children?: React.ReactNode;
}

export enum AppStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}