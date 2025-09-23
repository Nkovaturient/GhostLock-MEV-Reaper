import 'dotenv/config'

type OpenServConfig = {
  API_KEY: string
  WORKSPACE_ID: number
  AGENT_ID: number
}

type AppConfig = {
  OPENSERV: OpenServConfig
}

const CONFIG: AppConfig = {
  OPENSERV: {
    API_KEY: process.env.OPENSERV_API_KEY as string,
    WORKSPACE_ID: Number(process.env.OPENSERV_WORKSPACE_ID),
    AGENT_ID: Number(process.env.OPENSERV_AGENT_ID)
  }
}

export type { AppConfig, OpenServConfig }
export { CONFIG }
