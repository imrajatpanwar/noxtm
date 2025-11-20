#!/bin/bash
cp /etc/dovecot/users /etc/dovecot/users.backup

# Generate hashes for each password
H1=$(doveadm pw -s SHA512-CRYPT -p 'BZh7OfDtBiMfYfqE' 2>/dev/null)
H2=$(doveadm pw -s SHA512-CRYPT -p 'J6*^$jYC5#hWgmLy' 2>/dev/null)
H3=$(doveadm pw -s SHA512-CRYPT -p 'xOlovswswP&VTiF7' 2>/dev/null)
H4=$(doveadm pw -s SHA512-CRYPT -p 'FjcaaZE@pxVtIDOb' 2>/dev/null)
H5=$(doveadm pw -s SHA512-CRYPT -p 'zYtNscU4DHkwypTJ' 2>/dev/null)
H6=$(doveadm pw -s SHA512-CRYPT -p 'gtLSnubO^r%xmcGp' 2>/dev/null)
H7=$(doveadm pw -s SHA512-CRYPT -p 'dBQBDPi0Z7Or9JA2' 2>/dev/null)

cat > /etc/dovecot/users << EOF
noreply@noxtm.com:${H1}:5000:5000::/home/noreply::
info@noxtm.com:${H2}:5000:5000::/home/info::
support@noxtm.com:${H3}:5000:5000::/home/support::
sales@noxtm.com:${H4}:5000:5000::/home/sales::
contact@noxtm.com:${H5}:5000:5000::/home/contact::
admin@noxtm.com:${H6}:5000:5000::/home/admin::
rajat@noxtm.com:${H7}:5000:5000::/home/rajat::
EOF

systemctl reload dovecot
echo "✅ Dovecot users file updated and reloaded"
echo ""
echo "Updated accounts:"
cat /etc/dovecot/users
