# node-build-engine

[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![Opencollective financial contributors][opencollective-contributors]][opencollective-url]

[npm-image]: https://img.shields.io/npm/v/node-build-engine.svg
[npm-url]: https://npmjs.org/package/node-build-engine
[downloads-image]: https://img.shields.io/npm/dm/node-build-engine.svg
[downloads-url]: https://npmjs.org/package/node-build-engine
[opencollective-contributors]: https://opencollective.com/node-build-engine/tiers/badge.svg
[opencollective-url]: https://opencollective.com/node-build-engine

Esta ferramenta foi desenvolvida com o objetivo de simplificar o processo de construção de projetos modulares, adaptando-se a diversos ambientes, tanto em servidores quanto em navegadores. Ela inclui compiladores que transformam um módulo para os formatos CommonJS, ESM, UMD, entre outros, permitindo uma ampla flexibilidade na distribuição e uso dos seus projetos.

Instalação
----------

Primeiro, certifique-se de ter instalado a versão mais recente do node.js (pode ser necessário reiniciar o computador após esta etapa).

Do NPM para uso como um aplicativo de linha de comando:

    npm install node-build-engine -g

Do NPM para uso programático:

    npm install node-build-engine

Do NPX para uso como um aplicativo de linha de comando:

    npx node-build-engine

# Uso de linha de comando

<!-- CLI_USAGE:START -->

```
node-build-engine [tsconfig file] [options]
```

O `node-build-engine` utiliza o arquivo `tsconfig.json` como base para a compilação. Abaixo, você verá como usar o `tsconfig.json` para aplicar e entender algumas configurações adicionais ao utilizar o `node-build-engine`. Além disso, a ferramenta também faz uso do `package.json` para obter informações de forma simples e aplicá-las ao formato compilado, removendo impurezas que não são relevantes para o **NPM**.

### Opções de linha de comando

*Em desenvolvimento*

### Compilação

Como parte de seu padrão de funcionamento, o `node-build-engine` executa a compilação para os formatos CommonJS (csj) e ECMAScript Modules (esm). Essa abordagem possibilita a criação de uma estrutura de tipagem que é especialmente útil para o uso em projetos TypeScript. Os resultados da compilação são organizados na pasta "dist", onde são geradas três subpastas principais:

1. **csj**: Contém os arquivos compilados no formato CommonJS, adequados para a integração em projetos Node.js ou ambientes que suportam esse formato de módulo.

2. **esm**: Contém os arquivos compilados no formato ECMAScript Modules, ideais para uso em navegadores modernos ou em ambientes que suportam a importação de módulos ES6.

3. **types**: Esta pasta é dedicada aos arquivos de tipagem gerados durante a compilação, proporcionando uma experiência de desenvolvimento mais robusta e com suporte a tipos no TypeScript.

Além dessas três pastas essenciais, o `node-build-engine` também gera um arquivo `package.json` otimizado e livre de redundâncias. Esse arquivo é configurado de forma a ser facilmente publicável no NPM (Node Package Manager), seguindo as melhores práticas e garantindo que apenas as informações essenciais sejam incluídas, sem impurezas ou dados desnecessários.

Por fim, se o `tsconfig.json` estiver configurado para utilizar o `browserify` na compilação, o `node-build-engine` cria uma pasta adicional chamada `bundle`. Essa pasta contém os arquivos compilados utilizando o `browserify`, uma ferramenta de empacotamento de módulos JavaScript. Essa funcionalidade é especialmente útil para projetos que visam oferecer compatibilidade com navegadores antigos ou para integração em ambientes nos quais o `browserify` é necessário para a resolução de dependências e empacotamento de código.

### Documentação da Configuração `browserify` no `tsconfig.json`

A configuração `browserify` no arquivo `tsconfig.json` permite personalizar a compilação do `bundle` usando a ferramenta `browserify`, oferecendo controle refinado sobre o processo de empacotamento e configuração do módulo resultante. Abaixo está a representação detalhada da configuração `browserify` e suas opções disponíveis:

```json
{
    "compilerOptions": {
        "rootDir": "src",
        // outras opções do compilador
    },
    // outras configurações
    "browserify": {
        "entries": "./index.ts",
        "standalone": "MyLibrary",
        "ignore": ["some-module"],
        "insertGlobals": false,
        "detectGlobals": true,
        "ignoreMissing": false,
        "debug": true,
        "extensions": [".ts", ".js"],
        "noParse": ["large-library"],
        "externalRequireName": "require"
    }
}
```

#### Opções Disponíveis:

1. **entries** (string | string[]): Especifica o ponto de entrada ou os pontos de entrada para o `browserify`. Pode ser uma string para um único arquivo ou uma array de strings para múltiplos arquivos. Esta opção tem um comportamento específico que depende das configurações de diretório (`rootDir`) no `tsconfig.json`.Se caso `rootDir` não estiver definido, será considerado o caminho root que se encontra o `tsconfig.json`.

2. **standalone** (string): Define o nome do módulo global quando usado no navegador. Isso cria um pacote que pode ser importado como um script independente no HTML.

3. **ignore** (string[]): Lista de módulos a serem ignorados durante a compilação pelo `browserify`.

4. **insertGlobals** (boolean): Indica se o `browserify` deve inserir variáveis globais automáticas (como `process`, `Buffer`, etc.) nos módulos.

5. **detectGlobals** (boolean): Habilita a detecção de variáveis globais para evitar a inserção de polyfills desnecessários.

6. **ignoreMissing** (boolean): Define se o `browserify` deve ignorar erros de módulos ausentes.

7. **debug** (boolean): Habilita informações de depuração no pacote resultante, incluindo mapeamento de origem para depuração no navegador.

8. **extensions** (string[]): Lista de extensões de arquivo a serem consideradas pelo `browserify`.

9. **noParse** (string[]): Lista de módulos que o `browserify` deve evitar fazer o parsing, o que pode aumentar a velocidade de compilação.

10. **externalRequireName** (string): Define o nome da função `require` externa ao ser usada como script no navegador.

#### Uso:

Para configurar o `browserify` no `tsconfig.json`, inclua a seção `browserify` dentro da estrutura root e não dentro das opções do compilador (`compilerOptions`). Adapte os valores das opções conforme necessário para atender aos requisitos específicos do seu projeto, garantindo uma compilação eficiente e otimizada para a utilização em ambientes de navegador ou outras plataformas.

### Definição do `browser`

A definição do `browser` no `tsconfig.json` permite mapear módulos específicos para arquivos de adaptação do lado cliente, fornecendo uma forma de substituir módulos durante a compilação para ambientes de navegador. Esta definição tem um formato de `Record<string, string>`, onde a chave é o nome do módulo a ser mapeado e o valor é o caminho para o arquivo de adaptação do lado cliente.

```json
{
    "compilerOptions": {
        "rootDir": "src",
        // outras opções do compilador
    },
    // outras configurações
    "browser": {
        "moduleA": "./moduleA.browser.ts",
        "moduleB": "./moduleB.browser.ts",
        "./index.ts": "./browser.ts",
        ...
    }
}
```

Por exemplo, considerando a configuração acima:

- `"moduleA"` é mapeado para `./moduleA.browser.ts`, o que indica que durante a compilação para o ambiente do navegador, o módulo `moduleA` será substituído pelo arquivo `moduleA.browser.js` localizado no diretório `src`.

- `"moduleB"` é mapeado para `./moduleB.browser.ts`, seguindo a mesma lógica de substituição para o módulo `moduleB`.

- `"./index.ts"` é mapeado para `./browser.ts`, o que significa que o arquivo `index.ts` será substituído pelo arquivo `browser.ts` durante a compilação para o ambiente do navegador.

Todos os caminhas indicados tem um comportamento específico que depende das configurações de diretório (`rootDir`) no `tsconfig.json`. Se caso `rootDir` não estiver definido, será considerado o caminho root que se encontra o `tsconfig.json`.

Essa definição é semelhante à propriedade `browser` no `package.json`, mas está centralizada no `tsconfig.json` e permite um controle mais granular sobre as adaptações necessárias para o lado cliente do projeto. Ela é útil ao trabalhar em projetos que possuem diferentes implementações ou adaptações específicas para o navegador de determinados módulos.