variable "envfile" {
  type    = string
  default = ".env"
}

locals {
  envfile = {
    for line in split("\n", file(var.envfile)) : split("=", line)[0] => regex("=(.*)", line)[0]
    if !startswith(line, "#") && length(split("=", line)) > 1
  }
}

env {
  name = atlas.env
  src  = ["file://schema.pg.hcl"]
  url = local.envfile["DB_URL"]
  dev = "docker://postgres/18/dev"

  migration {
    dir = "file://migrations"
  }
}