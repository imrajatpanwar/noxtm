#!/bin/bash
# Fix Postfix master.cf dovecot transport

sed -i '144,145d' /etc/postfix/master.cf

cat >> /etc/postfix/master.cf << 'EOF'
dovecot unix - n n - - pipe
  flags=DRhu user=dovecot:dovecot argv=/usr/lib/dovecot/dovecot-lda -f ${sender} -d ${recipient}
EOF

postfix reload
echo "Fixed master.cf:"
tail -3 /etc/postfix/master.cf
