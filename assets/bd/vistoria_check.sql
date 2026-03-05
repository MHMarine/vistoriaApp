CREATE TABLE sindicos (
  uuid CHAR(36) NOT NULL UNIQUE,
  nome VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  senha VARCHAR(255),
  nivel ENUM('ADM','SINDICO') DEFAULT 'SINDICO',
  ativo TINYINT(1) DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE condominios (
  uuid CHAR(36) NOT NULL UNIQUE,
  nome VARCHAR(255),
  endereco VARCHAR(255),
  cidade VARCHAR(255),
  cnpj VARCHAR(20),
  sindico_uuid CHAR(36) NOT NULL,
  ativo TINYINT(1) DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME DEFAULT NULL,
  CONSTRAINT fk_condominios_sindico
    FOREIGN KEY (sindico_uuid) REFERENCES sindicos(uuid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE grupos (
  uuid CHAR(36) NOT NULL,
  sindico_uuid CHAR(36) NOT NULL,
  condominio_uuid CHAR(36) NOT NULL,
  nome VARCHAR(255) NOT NULL,
  prazo_meses INT NOT NULL,
  ordem INT DEFAULT 0,
  ativo TINYINT(1) DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME DEFAULT NULL,
  PRIMARY KEY (uuid),
  CONSTRAINT fk_grupos_sindico FOREIGN KEY (sindico_uuid) REFERENCES sindicos(uuid),
  CONSTRAINT fk_grupos_condominio FOREIGN KEY (condominio_uuid) REFERENCES condominios(uuid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE itens (
  uuid CHAR(36) NOT NULL,
  grupo_uuid CHAR(36) NOT NULL,
  nome VARCHAR(255) NOT NULL,
  ordem INT DEFAULT 0,
  ativo TINYINT(1) DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME DEFAULT NULL,
  PRIMARY KEY (uuid),
  CONSTRAINT fk_itens_grupo FOREIGN KEY (grupo_uuid) REFERENCES grupos(uuid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE vistorias (
  uuid CHAR(36) NOT NULL UNIQUE,
  device_uuid VARCHAR(255),
  sindico_uuid CHAR(36) NOT NULL,
  condominio_uuid CHAR(36) NOT NULL,
  data_vistoria DATETIME NOT NULL,
  status ENUM('EM_ANDAMENTO','FINALIZADA') DEFAULT 'EM_ANDAMENTO',
  ativo TINYINT(1) DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME DEFAULT NULL,
  CONSTRAINT fk_vistorias_condominio
    FOREIGN KEY (condominio_uuid) REFERENCES condominios(uuid),
  CONSTRAINT fk_vistorias_sindico
    FOREIGN KEY (sindico_uuid) REFERENCES sindicos(uuid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE vistoria_itens (
  uuid CHAR(36) NOT NULL UNIQUE,
  device_uuid VARCHAR(255),
  vistoria_uuid CHAR(36) NOT NULL,
  item_uuid CHAR(36) NOT NULL,
  status ENUM('OK','NOK','ND') NOT NULL,
  observacao TEXT,
  foto_path TEXT,
  ativo TINYINT(1) DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME DEFAULT NULL,
  CONSTRAINT fk_vistoria_itens_vistoria
    FOREIGN KEY (vistoria_uuid) REFERENCES vistorias(uuid) ON DELETE CASCADE,
  CONSTRAINT fk_vistoria_itens_item
    FOREIGN KEY (item_uuid) REFERENCES itens(uuid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_grupos_updated_at ON grupos(updated_at);
CREATE INDEX idx_itens_updated_at ON itens(updated_at);
CREATE INDEX idx_vistorias_updated_at ON vistorias(updated_at);
CREATE INDEX idx_vistoria_itens_updated_at ON vistoria_itens(updated_at);

SET time_zone = '+00:00';

START TRANSACTION;
