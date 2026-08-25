# Authentication

Source: https://docs.meshy.ai/en/api/authentication

Using the Meshy API requires authentication. This guide will show you how to create an account and API keys.

## API Keys

### Creating a Meshy Account

Meshy API requires you to have a Meshy account to create and manage API keys. If a request is made to the API without an API key, the API will respond with an invalid credentials error.

You can create a Meshy account by visiting the [Meshy official website](https://www.meshy.ai/) and sign up.

### Creating API Keys

Once you have created a Meshy account, you can create API keys by visiting the [API settings page](https://www.meshy.ai/settings/api).

You can create multiple API keys for different purposes. For example, you can create one API key for your iOS app and another for your web app. The usage of each API key is tracked separately, and you can revoke them at any time.

To create an API key, click on the `Create API Key` button on the API page, and then enter a name for your API key.

Once you have created an API key, you will be shown the API key value. You can copy the API key value and store it in a secure location. **You will not be able to see this API key value again.**

### Using API Keys

Once you have created an API key, you can use it to authenticate your requests to the Meshy API. You can pass your API key to the API in the `Authorization` header:

```json
{
  "Authorization": "Bearer msy_sOmEbOgUsApIkEyFoReXaMpLe1234567890"
}
```

The `Bearer ` prefix in the header value is mandatory to interact with the Meshy API programmatically. You can learn more about it at [IETF RFC 6750](https://datatracker.ietf.org/doc/html/rfc6750).

## Security

We take security very seriously at Meshy, and we work hard to ensure that Meshy API is secure. Here are some high-level guidelines to help you keep your data and requests safe when using Meshy API.

### Transport Layer Security

While your data is encrypted at rest once it's stored in Meshy, Meshy API uses and enforces [TLS](https://en.wikipedia.org/wiki/Transport_Layer_Security), to encrypt data in transit. It means that all requests to and from Meshy API are sent over HTTPS, and any request made over HTTP will get an `301 Moved Permanently` status code. Although not recommended, in some cases, if you have to talk to HTTP, you need to explicitly tell your HTTP client to follow HTTP to HTTPS redirections:

```bash
# use `-L` to follow HTTP to HTTPS redirections
curl -L -X 'POST' \
  https://api.meshy.ai/openapi/v1/text-to-texture
```

### API Key Safety

Please note that even Meshy team members cannot view or recover revoked API keys for you!

Once minted, API keys are not visible in the dashboard anymore, so please download and keep it safe and securely since anyone who obtains it can use it to talk to Meshy API on your behalf. If you believe your API key has been compromised, you can revoke it at any time from the dashboard; once revoked, it will no longer be valid.

### Security Disclosure

If you believe you've discovered a security issue in Meshy API, please [get in touch](mailto:support@meshy.ai) with us. We appreciate your responsible disclosure and will make every effort to acknowledge your contributions.