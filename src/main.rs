use oauth2::{
    basic::{BasicClient, BasicErrorResponseType, BasicTokenType},
    ureq::http_client,
    url::Url,
    AccessToken, AuthUrl, AuthorizationCode, Client, ClientId, ClientSecret, CsrfToken,
    EmptyExtraTokenFields, RedirectUrl, RefreshToken, RevocationErrorResponseType, Scope,
    StandardErrorResponse, StandardRevocableToken, StandardTokenIntrospectionResponse,
    StandardTokenResponse, TokenResponse, TokenUrl,
};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{
    fs::{write, File},
    time::{SystemTime, UNIX_EPOCH},
};

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct Credentials {
    client_id: String,
    client_secret: String,
    project_id: String,
    auth_uri: String,
    token_uri: String,
    auth_provider_x509_cert_url: String,
    redirect_uris: Vec<String>,
}

type CustomClient = Client<
    StandardErrorResponse<BasicErrorResponseType>,
    StandardTokenResponse<EmptyExtraTokenFields, BasicTokenType>,
    BasicTokenType,
    StandardTokenIntrospectionResponse<EmptyExtraTokenFields, BasicTokenType>,
    StandardRevocableToken,
    StandardErrorResponse<RevocationErrorResponseType>,
>;
fn get_client() -> CustomClient {
    let credentials: Credentials = serde_json::from_reader(
        File::open("credentials.json").expect("failed to open credentials.json"),
    )
    .expect("failed to deserialize");

    BasicClient::new(
        ClientId::new(credentials.client_id),
        Some(ClientSecret::new(credentials.client_secret)),
        AuthUrl::new(credentials.auth_uri).unwrap(),
        Some(TokenUrl::new(credentials.token_uri).unwrap()),
    )
    .set_redirect_uri(
        RedirectUrl::new(
            credentials.redirect_uris[if cfg!(debug_assertions) { 1 } else { 0 }].clone(),
        )
        .unwrap(),
    )
}

fn generate_url(client: &CustomClient) -> Url {
    let (url, _csrf_token) = client
        .authorize_url(CsrfToken::new_random)
        .add_scope(Scope::new(
            "https://www.googleapis.com/auth/drive.readonly".to_string(),
        ))
        .add_extra_param("access_type", "offline")
        .add_extra_param("prompt", "consent")
        .url();
    url
}

#[derive(Debug, Serialize, Deserialize)]
struct Token {
    access_token: AccessToken,
    refresh_token: RefreshToken,
    expires_at: u64,
    scope: String,
    token_type: String,
}

fn token_ser(inp: StandardTokenResponse<EmptyExtraTokenFields, BasicTokenType>) -> Token {
    let mut v = serde_json::to_value(&inp).expect("failed to serialize");
    v["expires_at"] = Value::from(
        (SystemTime::now() + inp.expires_in().expect("expires_in not found"))
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs(),
    );
    serde_json::from_value(v).expect("failed to deserialize")
}

fn exchange_code(client: &CustomClient, code: String) -> Token {
    let res = client
        .exchange_code(AuthorizationCode::new(code))
        .request(http_client)
        .map_err(|e| e.to_string())
        .expect("code exchange failed");
    token_ser(res)
}
fn refresh_token(client: &CustomClient, token: &Token) -> Token {
    let mut res = client
        .exchange_refresh_token(&token.refresh_token)
        .request(http_client)
        .expect("refresh failed");
    res.set_refresh_token(Some(token.refresh_token.clone())); // refresh_token is not returned by google
    token_ser(res)
}

fn store_token(token: &Token) {
    write(
        "token.json",
        serde_json::to_string_pretty(&token).expect("failed to serialize"),
    )
    .expect("failed to write token.json");
    write("token.txt", &token.access_token.secret()).expect("failed to write token.txt");
}
fn get_token() -> Token {
    serde_json::from_reader(File::open("token.json").expect("failed to open token.json"))
        .expect("failed to deserialize")
}

fn refresh_loop(client: &CustomClient) {
    loop {
        let token: Token = match File::open("token.json") {
            Ok(f) => serde_json::from_reader(f).expect("failed to deserialize"),
            Err(_) => continue,
        };
        if token.expires_at
            < SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_secs()
                + 1800
        {
            eprintln!("refreshing token");
            store_token(&refresh_token(&client, &token));
        } else {
            eprintln!("token still valid");
            if !std::path::Path::new("token.txt").exists() {
                store_token(&token);
                eprintln!("token.txt written");
            }
        }
        std::thread::sleep(std::time::Duration::from_secs(1800));
    }
}

fn main() {
    let client = get_client();

    let mut args = std::env::args().skip(1);
    match args.next().as_deref() {
        Some("url") => println!("url: {}", generate_url(&client)),
        Some("login") => {
            // let code = args.next().expect("code not found").trim().to_owned();
            let code = "4/0AfgeXvviH_4pzOO00Vg2_N4SzsI9hv7-rFJ6qjY0-3p0rzrhveoT8_o_IjvFtIgjsNx8MQ"
                .to_string();
            dbg!(&code);
            let token = exchange_code(&client, code);
            store_token(&token);
        }
        Some("refresh") => store_token(&refresh_token(&client, &get_token())),
        Some("auto-refresh") => refresh_loop(&client),
        _ => panic!("unknown command"),
    }
}
