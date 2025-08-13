#!/bin/bash

set -euo pipefail

filename=$(echo "$1" | tr '[:upper:]' '[:lower:]')
camel_filename=$(echo "${filename}" | perl -pe 's/_([a-z])/uc($1)/ge')
upper_camel_filename="$(tr '[:lower:]' '[:upper:]' <<< ${camel_filename:0:1})${camel_filename:1}"

curtime=$(date "+%Y%m%d%H%M%S")
script_dir=$(dirname $0)
migration_dir=$(dirname ${script_dir})/migration

if [ ! -d "${migration_dir}" ]; then
    mkdir -p "${migration_dir}"
fi

migration_filepath="${migration_dir}/${curtime}_${filename}.go"

cat > "${migration_filepath}" << EOF
package migration

import (
	"gorm.io/gorm"

	"github.com/chaitin/koalaqa/migration/migrator"
)

type ${camel_filename} struct{}

func (m *${camel_filename}) Version() int64 {
	return ${curtime}
}

func (m *${camel_filename}) Migrate(tx *gorm.DB) error {

}

func new${upper_camel_filename}() migrator.Migrator {
	return &${camel_filename}{}
}

func init() {
	registerDBMigrator(new${upper_camel_filename})
}
EOF

echo "migration file: ${migration_filepath}"
echo "init done"