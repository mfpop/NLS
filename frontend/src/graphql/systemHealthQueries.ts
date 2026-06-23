import { gql } from "@apollo/client";

export const SYSTEM_HEALTH_QUERY = gql`
  query SystemHealth {
    systemHealth {
      overallStatus
      appStatus
      apiStatus
      databaseStatus
      diskUsage
      memoryUsage
      services {
        name
        status
        detail
      }
      recentErrors {
        source
        message
        timestamp
        severity
      }
      deploymentInfo {
        appVersion
        commit
        environment
        debugEnabled
        lastDeploy
        djangoVersion
        pythonVersion
        serverTime
      }
      checks {
        name
        status
        detail
      }
    }
  }
`;
