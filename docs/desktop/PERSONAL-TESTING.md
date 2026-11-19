# Personal testing with OpenAI

EditAI Web and Desktop are free editors. AI can use your connected Publik account or your own OpenAI API key. The iOS application's subscriptions are separate.

1. Open EditAI and complete **Sign in with publik**. This is still required for the fellowship entry; purchasing a Publik plan is not required for the own-key option.
2. Choose **Use my own key**. EditAI opens Settings if no key is saved. On an existing session, open Settings and select **My OpenAI key**.
3. Create an API key in your own OpenAI API project at https://platform.openai.com/api-keys. API billing is separate from a ChatGPT subscription. A ChatGPT login/session token or a Codex token is not an OpenAI API key.
4. Paste the key into the password field **Own OpenAI API key** inside EditAI. Do not put it in chat, source, an environment file, screenshots or logs. Saving the key selects OpenAI automatically.
5. Enable AI processing if you want to test it. For personal/automated testing, turn off **Share official usage events**. Save preferences. The key field clears after saving.
6. Import a short video, generate captions and ask EditAI to edit it. Direct OpenAI calls currently use `whisper-1` for word-timed transcription and `gpt-4o-mini` for chat, summary and editorial review. These requests use your OpenAI API account and may incur API charges; they do not draw from Publik.

Desktop stores the API key encrypted in local app storage; its encryption key is protected by the OS credential vault (Keychain on macOS). The hosted web version stores the encrypted key on its server. The secret is never returned to the renderer/browser. Project/media storage remains unchanged.

Own-key mode still verifies Publik sign-in. It is not an offline or authentication-bypass mode. Personal use does not count toward fellowship rankings. The handbook also describes fellowship AI credits; check your Publik wallet if you want to test that provider without buying a subscription.
