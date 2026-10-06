// Gera um arquivo .xlsx (Excel) com uma aba, direto no navegador, sem biblioteca externa.
// Cabeçalho em negrito sobre azul-marinho, primeira linha congelada, filtro e larguras de coluna.
// Uso: xlsxBaixar('arquivo.xlsx', 'Nome da aba', [['Coluna', largura], ...], [[valor, valor, ...], ...])
// Valores: texto ou número. Datas vão como texto (dd/mm/aaaa) para não depender do formato do Excel.
(function(){
  var TAB = (function(){ var t = [], c; for (var n = 0; n < 256; n++) { c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(u8){ var c = 0xFFFFFFFF; for (var i = 0; i < u8.length; i++) c = TAB[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  var enc = new TextEncoder();
  function xml(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ''); }
  function colLetra(n){ var s = ''; n++; while (n > 0) { var r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); } return s; }
  function dosData(d){ return { t: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), d: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate() }; }

  // ZIP sem compressão (método "store"): o .xlsx é um zip de arquivos XML
  function zip(arquivos){
    var partes = [], central = [], off = 0, agora = dosData(new Date());
    for (var i = 0; i < arquivos.length; i++) {
      var nome = enc.encode(arquivos[i].nome), dados = arquivos[i].dados, crc = crc32(dados);
      var lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
      lh.setUint16(10, agora.t, true); lh.setUint16(12, agora.d, true); lh.setUint32(14, crc, true); lh.setUint32(18, dados.length, true); lh.setUint32(22, dados.length, true);
      lh.setUint16(26, nome.length, true); lh.setUint16(28, 0, true);
      partes.push(new Uint8Array(lh.buffer), nome, dados);
      var ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true);
      ch.setUint16(12, agora.t, true); ch.setUint16(14, agora.d, true); ch.setUint32(16, crc, true); ch.setUint32(20, dados.length, true); ch.setUint32(24, dados.length, true);
      ch.setUint16(28, nome.length, true); ch.setUint16(30, 0, true); ch.setUint16(32, 0, true); ch.setUint16(34, 0, true); ch.setUint16(36, 0, true); ch.setUint32(38, 0, true); ch.setUint32(42, off, true);
      central.push(new Uint8Array(ch.buffer), nome);
      off += 30 + nome.length + dados.length;
    }
    var tamC = 0; for (var j = 0; j < central.length; j++) tamC += central[j].length;
    var eo = new DataView(new ArrayBuffer(22));
    eo.setUint32(0, 0x06054b50, true); eo.setUint16(4, 0, true); eo.setUint16(6, 0, true); eo.setUint16(8, arquivos.length, true); eo.setUint16(10, arquivos.length, true); eo.setUint32(12, tamC, true); eo.setUint32(16, off, true); eo.setUint16(20, 0, true);
    var todas = partes.concat(central, [new Uint8Array(eo.buffer)]), total = 0;
    for (var k = 0; k < todas.length; k++) total += todas[k].length;
    var out = new Uint8Array(total), pos = 0;
    for (var m = 0; m < todas.length; m++) { out.set(todas[m], pos); pos += todas[m].length; }
    return out;
  }

  function celula(c, r, v, estilo){
    if (v == null || v === '') return '';
    var ref = colLetra(c) + r, st = estilo ? ' s="' + estilo + '"' : '';
    if (typeof v === 'number' && isFinite(v)) return '<c r="' + ref + '"' + st + '><v>' + v + '</v></c>';
    return '<c r="' + ref + '"' + st + ' t="inlineStr"><is><t xml:space="preserve">' + xml(v) + '</t></is></c>';
  }

  function planilha(colunas, linhas){
    var fim = colLetra(colunas.length - 1) + (linhas.length + 1), c, r;
    var s = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
      + '<dimension ref="A1:' + fim + '"/>'
      + '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A2" sqref="A2"/></sheetView></sheetViews>'
      + '<sheetFormatPr defaultRowHeight="15"/><cols>';
    for (c = 0; c < colunas.length; c++) s += '<col min="' + (c + 1) + '" max="' + (c + 1) + '" width="' + (colunas[c][1] || 14) + '" customWidth="1"/>';
    s += '</cols><sheetData><row r="1">';
    for (c = 0; c < colunas.length; c++) s += celula(c, 1, colunas[c][0], 1);
    s += '</row>';
    for (r = 0; r < linhas.length; r++) {
      s += '<row r="' + (r + 2) + '">';
      for (c = 0; c < colunas.length; c++) s += celula(c, r + 2, linhas[r][c], 0);
      s += '</row>';
    }
    s += '</sheetData><autoFilter ref="A1:' + fim + '"/>'
      + '<pageMargins left="0.5" right="0.5" top="0.75" bottom="0.75" header="0.3" footer="0.3"/><pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/></worksheet>';
    return s;
  }

  var ESTILOS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    + '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>'
    + '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0B2A5E"/><bgColor indexed="64"/></patternFill></fill></fills>'
    + '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
    + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
    + '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs>'
    + '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';

  function nomeAba(s){ s = String(s || 'Dados').replace(/[\[\]:*?\/\\]/g, ' ').trim().slice(0, 31); return s || 'Dados'; }

  function gerar(aba, colunas, linhas){
    aba = nomeAba(aba);
    var fim = colLetra(colunas.length - 1) + (linhas.length + 1);
    var workbook = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
      + '<sheets><sheet name="' + xml(aba) + '" sheetId="1" r:id="rId1"/></sheets>'
      + '<definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">\'' + xml(aba.replace(/'/g, "''")) + '\'!$A$1:$' + colLetra(colunas.length - 1) + '$' + (linhas.length + 1) + '</definedName></definedNames></workbook>';
    var arquivos = [
      { nome: '[Content_Types].xml', dados: enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>') },
      { nome: '_rels/.rels', dados: enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>') },
      { nome: 'xl/workbook.xml', dados: enc.encode(workbook) },
      { nome: 'xl/_rels/workbook.xml.rels', dados: enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>') },
      { nome: 'xl/styles.xml', dados: enc.encode(ESTILOS) },
      { nome: 'xl/worksheets/sheet1.xml', dados: enc.encode(planilha(colunas, linhas)) }
    ];
    return zip(arquivos);
  }

  window.xlsxGerar = gerar;
  window.xlsxBaixar = function(arquivo, aba, colunas, linhas){
    var blob = new Blob([gerar(aba, colunas, linhas)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    var u = URL.createObjectURL(blob), el = document.createElement('a');
    el.href = u; el.download = arquivo; document.body.appendChild(el); el.click(); el.remove();
    setTimeout(function(){ URL.revokeObjectURL(u); }, 4000);
  };
})();
