import fs from "fs";
import os from "os";
import path from "path";

export type Config = {
  dbUrl: string;
  currentUserName?: string;
};

type RawConfig = {
  db_url: string;
  current_user_name?: string;
};

function getConfigFilePath(): string {
  return path.join(os.homedir(), ".gatorconfig.json");
}

function validateConfig(rawConfig: any): Config {
  if (typeof rawConfig !== "object" || rawConfig === null) {
    throw new Error("Config is not an object");
  }
  if (typeof rawConfig.db_url !== "string") {
    throw new Error("Config is missing db_url");
  }
  if (
    rawConfig.current_user_name !== undefined &&
    typeof rawConfig.current_user_name !== "string"
  ) {
    throw new Error("current_user_name must be a string");
  }

  const config: Config = {
    dbUrl: rawConfig.db_url,
  };
  if (rawConfig.current_user_name !== undefined) {
    config.currentUserName = rawConfig.current_user_name;
  }
  return config;
}

function writeConfig(cfg: Config): void {
  const rawConfig: RawConfig = {
    db_url: cfg.dbUrl,
    current_user_name: cfg.currentUserName,
  };
  const data = JSON.stringify(rawConfig, null, 2);
  fs.writeFileSync(getConfigFilePath(), data, { encoding: "utf-8" });
}

export function readConfig(): Config {
  const fullPath = getConfigFilePath();
  const data = fs.readFileSync(fullPath, { encoding: "utf-8" });
  const rawConfig = JSON.parse(data);
  return validateConfig(rawConfig);
}

export function setUser(cfg: Config, userName: string): void {
  cfg.currentUserName = userName;
  writeConfig(cfg);
}
