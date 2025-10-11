# DNS Configuration for Noxtm Mail Server

## Status: Mail Server Installed ✅

Your Postfix mail server is now installed and running on `185.137.122.61`

---

## Required DNS Records in Cloudflare

### 1. MX Record (Mail Exchange) - **REQUIRED**

**Current Status:** You have Cloudflare Email Routing MX records. **You need to UPDATE these.**

**Action:** Replace existing MX records with:

```
Type: MX
Name: @  (or noxtm.com)
Content: mail.noxtm.com
Priority: 10
TTL: Auto
Proxy: N/A (MX records can't be proxied)
```

### 2. A Record for Mail Server - **ALREADY EXISTS** ✅

**Current Status:** EXISTS but has a warning ⚠️

```
Type: A
Name: mail
Content: 185.137.122.61
TTL: Auto
Proxy: DNS only (MUST be DNS only, not proxied!)
```

**Important:** Make sure "Proxy status" is **OFF** (gray cloud icon). Mail servers cannot be proxied.

### 3. SPF Record - **UPDATE REQUIRED**

**Current Status:** You have an SPF record, but it needs to be updated to include your mail server.

**Action:** Update the TXT record:

```
Type: TXT
Name: @  (or noxtm.com)
Content: v=spf1 mx a ip4:185.137.122.61 include:_spf.mx.cloudflare.net ~all
TTL: Auto
```

**Note:** I included your Cloudflare Email Routing SPF in case you want to keep it active.

### 4. DKIM Record - **ADD NEW** 🆕

**Action:** Add this new TXT record:

```
Type: TXT
Name: mail._domainkey
Content: v=DKIM1; h=sha256; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAyGuGWEOb/gphrwXjnfCboFdcQNInMoRhh83bWCLqE4By4QEjdaxf3XdDAVcfYy0CfK+rIBn6/lR2XZPs/r7hCfS7sbQXTTXCmiEdpzAL3qI69GoVQE3OCNzaB8wjq48x6KXa8K3mAHUkcOvnCnMRpb7vhSQm+P4kH8La24e4+GG0ak7UPQPdUj/QQPY4NjZdTT0RJuwCHCFfDVcIko7KeZoZHSWEJYKgSLpAEE8A4PQioAqlCuFRhxM6L1WsGLDYiROHnBo2bWgc/8rPyoh06ToF1RNamsXv1An92DuWj1saTssZ2cLM0MCTcga/YZuiHZJh2px7f0z2vOacyp1udwIDAQAB
TTL: Auto
```

**Simplified for Cloudflare (remove quotes and concatenate):**
```
Content: v=DKIM1; h=sha256; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAyGuGWEOb/gphrwXjnfCboFdcQNInMoRhh83bWCLqE4By4QEjdaxf3XdDAVcfYy0CfK+rIBn6/lR2XZPs/r7hCfS7sbQXTTXCmiEdpzAL3qI69GoVQE3OCNzaB8wjq48x6KXa8K3mAHUkcOvnCnMRpb7vhSQm+P4kH8La24e4+GG0ak7UPQPdUj/QQPY4NjZdTT0RJuwCHCFfDVcIko7KeZoZHSWEJYKgSLpAEE8A4PQioAqlCuFRhxM6L1WsGLDYiROHnBo2bWgc/8rPyoh06ToF1RNamsXv1An92DuWj1saTssZ2cLM0MCTcga/YZuiHZJh2px7f0z2vOacyp1udwIDAQAB
```

### 5. DMARC Record - **ADD NEW** 🆕

**Action:** Add this new TXT record:

```
Type: TXT
Name: _dmarc
Content: v=DMARC1; p=none; rua=mailto:admin@noxtm.com; ruf=mailto:admin@noxtm.com; sp=none; adkim=r; aspf=r
TTL: Auto
```

**What this means:**
- `p=none` - Monitor only (don't reject emails yet)
- `rua` - Send aggregate reports to admin@noxtm.com
- `ruf` - Send forensic reports to admin@noxtm.com
- `sp=none` - Same policy for subdomains
- `adkim=r` - Relaxed DKIM alignment
- `aspf=r` - Relaxed SPF alignment 

**After 1-2 weeks of monitoring**, you can change to `p=quarantine` or `p=reject` for stricter policies.

---

## 6. Reverse DNS (PTR Record) - **CONTACT CONTABO**

**Status:** Currently points to `vmi2768295.contaboserver.net`

**Action Required:** Contact Contabo Support to update PTR record:

```
185.137.122.61 → mail.noxtm.com
```

**How to contact Contabo:**
1. Login to your Contabo account
2. Go to Support > Create Ticket
3. Subject: "PTR Record Update Request"
4. Message:
   ```
   Hello,

   Please update the reverse DNS (PTR record) for my server:

   IP Address: 185.137.122.61
   PTR Record: mail.noxtm.com

   This is needed for email server deliverability.

   Thank you!
   ```

**Note:** This usually takes 24-48 hours to process.

---

## Summary Checklist

- [ ] **Update MX record** to point to `mail.noxtm.com` (priority 10)
- [ ] **Verify A record** for `mail.noxtm.com` → `185.137.122.61` (DNS only, not proxied)
- [ ] **Update SPF record** to include your mail server IP
- [ ] **Add DKIM TXT record** at `mail._domainkey`
- [ ] **Add DMARC TXT record** at `_dmarc`
- [ ] **Contact Contabo** to set reverse DNS (PTR record)

---

## Verification After DNS Updates

### Wait for Propagation (15-30 minutes)
DNS changes can take time to propagate globally.

### Test Your DNS Records

1. **Check MX Record:**
   ```bash
   nslookup -type=mx noxtm.com 8.8.8.8
   ```
   Should show: `mail.noxtm.com`

2. **Check A Record:**
   ```bash
   nslookup mail.noxtm.com 8.8.8.8
   ```
   Should show: `185.137.122.61`

3. **Check SPF Record:**
   ```bash
   nslookup -type=txt noxtm.com 8.8.8.8
   ```
   Should include: `v=spf1 mx a ip4:185.137.122.61`

4. **Check DKIM Record:**
   ```bash
   nslookup -type=txt mail._domainkey.noxtm.com 8.8.8.8
   ```
   Should show your DKIM public key

5. **Check DMARC Record:**
   ```bash
   nslookup -type=txt _dmarc.noxtm.com 8.8.8.8
   ```
   Should show: `v=DMARC1; p=none`

6. **Check Reverse DNS (after Contabo updates):**
   ```bash
   nslookup 185.137.122.61
   ```
   Should show: `mail.noxtm.com`

---

## Testing Email Deliverability

### 1. Send Test Email
```bash
ssh root@185.137.122.61
echo "Test email from Noxtm mail server" | mail -s "Test Email" your-email@gmail.com
```

### 2. Check with Mail-Tester
Send an email to the address provided by https://www.mail-tester.com
- Aim for a score of 8/10 or higher
- It will show any DNS or configuration issues

### 3. Check Email Headers
When you receive a test email, view the full headers and look for:
- `DKIM-Signature: PASS`
- `SPF: PASS`
- `DMARC: PASS`

---

## Current Server Configuration

- **Hostname:** mail.noxtm.com
- **IP Address:** 185.137.122.61
- **Mail Server:** Postfix (SMTP)
- **DKIM:** OpenDKIM (configured)
- **Security:** Fail2ban (active)
- **Ports Open:**
  - 25 (SMTP)
  - 587 (SMTP Submission)
- **SSL/TLS:** Self-signed (temporary) - Can upgrade to Let's Encrypt later

---

## What's Next?

1. **Update DNS records in Cloudflare** (above)
2. **Wait 24-48 hours** for PTR record from Contabo
3. **Update Backend .env** to use mail server:
   ```env
   EMAIL_HOST=localhost
   EMAIL_PORT=25
   EMAIL_USER=
   EMAIL_PASS=
   EMAIL_FROM=noreply@noxtm.com
   ```
4. **Test sending emails** from your Node.js backend
5. **Monitor deliverability** for first 2 weeks
6. **Gradually increase volume** to build sender reputation

---

## Troubleshooting

### Emails going to spam?
- Wait 1-2 weeks for sender reputation to build
- Ensure all DNS records are correct
- Check PTR record is set
- Start with low volume (< 100 emails/day)

### DKIM verification failing?
- Wait for DNS propagation (up to 48 hours)
- Use `dig mail._domainkey.noxtm.com TXT` to verify record

### Can't send emails?
- Check Postfix logs: `tail -f /var/log/mail.log`
- Verify ports are open: `netstat -tuln | grep -E '(25|587)'`
- Test connectivity: `telnet localhost 25`

---

## Support

If you need help:
1. Check `/var/log/mail.log` on server for errors
2. Verify DNS with online tools:
   - https://mxtoolbox.com/SuperTool.aspx
   - https://dnschecker.org/
3. Test email authentication:
   - https://www.mail-tester.com
   - https://dkimvalidator.com/

---

**Your mail server is ready to use once DNS is configured!** 🚀
