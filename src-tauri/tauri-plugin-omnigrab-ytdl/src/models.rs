use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoInfoRequest {
  pub url: String,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoInfoResponse {
  pub data: String,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadRequest {
  pub id: String,
  pub url: String,
  pub output_path: String,
  pub format: String,
  pub embed_thumbnail: bool,
  pub embed_metadata: bool,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadResponse {
  pub status: String,
}
