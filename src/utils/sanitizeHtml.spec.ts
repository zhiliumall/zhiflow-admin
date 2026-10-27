/**
 * 富文本净化白名单回归测试：
 * 1. XSS 拦截不因白名单扩容而松动（script/iframe/事件属性/javascript: URI），尤其 details 的 ontoggle；
 * 2. section/details/summary 结构与 data-* 属性完整保留，白名单被误删会静默剥壳。
 */
import { describe, expect, it } from "vitest";
import { sanitizeRichText, sanitizeRichTextForEdit } from "./sanitizeHtml";

describe("区块结构保留", () => {
  it("section + data-* 原样通过", () => {
    const html =
      '<section class="rich-card" data-node="goods-card" data-v="1" data-goods-id="88123"><a href="https://example.com/goods?id=88123"><img src="https://example.com/g.jpg"><span>示例商品</span></a></section>'
    const out = sanitizeRichText(html)
    expect(out).toContain('data-node="goods-card"')
    expect(out).toContain('data-v="1"')
    expect(out).toContain('data-goods-id="88123"')
    expect(out).toContain('<section')
  })

  it("details/summary 结构保留且 open 属性放行（折叠问答）", () => {
    const html =
      '<details data-node="faq" data-v="1" open><summary>多久发货？</summary><div><p>下单后 48 小时内。</p></div></details>'
    const out = sanitizeRichText(html)
    expect(out).toContain('<details')
    expect(out).toContain('<summary>')
    expect(out).toContain('open')
    expect(out).toContain('data-node="faq"')
  })

  it("section 嵌套块级内容不被剥壳", () => {
    const html =
      '<section data-node="callout" data-v="1" data-variant="danger" data-title="注意"><div class="callout__title">注意</div><div class="callout__body"><p>请在收货后检查包装。</p></div></section>'
    const out = sanitizeRichText(html)
    expect(out).toContain('data-variant="danger"')
    expect(out).toContain('callout__body')
    expect(out).toContain('<p>请在收货后检查包装。</p>')
  })
})

describe("XSS 拦截不松动", () => {
  it("script / iframe 整体剔除", () => {
    expect(sanitizeRichText('<p>a</p><script>alert(1)</script>')).not.toContain('script')
    // 非白名单 iframe 在渲染出口被换成占位块（策略见 sanitizeHtml.ts 文件头）
    expect(sanitizeRichText('<iframe src="https://evil.com"></iframe><p>b</p>')).not.toContain('<iframe')
  })

  it("img onerror 事件属性被剥", () => {
    const out = sanitizeRichText('<img src="x" onerror="alert(1)">')
    expect(out).toContain('<img')
    expect(out).not.toContain('onerror')
  })

  it("details ontoggle 被剥（新加标签的事件注入面）", () => {
    const out = sanitizeRichText('<details ontoggle="alert(1)" open><summary>q</summary></details>')
    expect(out).toContain('<details')
    expect(out).not.toContain('ontoggle')
  })

  it("javascript: 链接被拦，https 链接放行", () => {
    expect(sanitizeRichText('<a href="javascript:alert(1)">x</a>')).not.toContain('javascript:')
    expect(sanitizeRichText('<a href="https://example.com">x</a>')).toContain('https://example.com')
  })

  it("data-* 属性值不会被当作可执行内容二次解析", () => {
    const out = sanitizeRichText('<section data-zf-node="callout" data-title="&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;"><p>x</p></section>')
    // 属性值里的转义实体保持为纯文本属性，不产生真实 script 标签
    expect(out).not.toContain('<script')
  })
})

describe("编辑器载入净化 sanitizeRichTextForEdit", () => {
  // 这几条盯死一件事：编辑器「打开→不改→保存」不得损坏存量内容。
  // 历史风险 —— 渲染配置 FORBID iframe，而 wangEditor 嵌入视频产物就是 iframe，
  // 用渲染配置净化会让存量视频在最无辜的操作路径上被静默删除并写回后端。
  it("白名单 host 的 iframe 两侧都保留（wangEditor 嵌入视频）", () => {
    const html = '<div data-w-e-type="video"><iframe src="https://player.bilibili.com/x.html"></iframe></div>';
    expect(sanitizeRichTextForEdit(html)).toContain("<iframe");
    expect(sanitizeRichText(html)).toContain("<iframe");
  });

  // ★ 这条盯死本模块最核心的不对称：编辑态删节点 = 保存时数据损坏。
  //   载入后 DOM 是净化过的，用户敲第一个字符 onEditorInput 就把 DOM 回写进
  //   form.articleContent —— 载入时丢掉的内容从此永久丢失。
  it("编辑态：非白名单 host 的 iframe 也必须保留（删了会在首次输入后写回丢失）", () => {
    const out = sanitizeRichTextForEdit('<iframe src="https://unknown-cdn.example/v"></iframe>');
    expect(out).toContain("<iframe");
    expect(out).toContain("unknown-cdn.example");
    // 保留但必须已中和
    expect(out).toContain('sandbox="allow-scripts allow-presentation"');
  });

  it("渲染态：非白名单 host 换成可见占位块，而不是静默空白", () => {
    const out = sanitizeRichText('<p>a</p><iframe src="https://unknown-cdn.example/v"></iframe>');
    expect(out).not.toContain("<iframe");
    expect(out).toContain("zf-embed-blocked");
    expect(out).toContain("预览已拦截");
    expect(out).toContain("<p>a</p>");
  });

  it("保留 iframe 的展示属性并强制 sandbox", () => {
    const out = sanitizeRichTextForEdit(
      '<iframe src="https://player.bilibili.com/v" allowfullscreen frameborder="0" width="640" height="360"></iframe>',
    );
    expect(out).toContain("allowfullscreen");
    expect(out).toContain('frameborder="0"');
    expect(out).toContain('sandbox="allow-scripts allow-presentation"');
    expect(out).not.toContain("allow-same-origin");
  });

  it("剥掉 allow 属性（Permissions Policy 委派：摄像头/麦克风）", () => {
    const out = sanitizeRichTextForEdit(
      '<iframe src="https://player.bilibili.com/v" allow="camera; microphone"></iframe>',
    );
    expect(out).toContain("<iframe");
    expect(out).not.toContain("camera");
    expect(out).not.toContain("allow=");
  });

  it("剥掉 iframe 的 style（掐死全屏透明覆盖式 clickjacking）", () => {
    const out = sanitizeRichTextForEdit(
      '<iframe src="https://player.bilibili.com/v" style="position:fixed;top:0;left:0;opacity:0.02" width="9999"></iframe>',
    );
    expect(out).toContain("<iframe");
    expect(out).not.toContain("position:fixed");
    expect(out).not.toContain("opacity");
  });

  it("放宽仅限 iframe：script/object/embed/form 仍禁止", () => {
    for (const tag of ["script", "object", "embed", "form"]) {
      expect(sanitizeRichTextForEdit(`<${tag}></${tag}><p>x</p>`)).not.toContain(`<${tag}`);
    }
  });

  it("事件属性仍被剥（F2 要防的 img onerror 依然拦得住）", () => {
    const out = sanitizeRichTextForEdit('<img src="x" onerror="alert(1)">');
    expect(out).toContain("<img");
    expect(out).not.toContain("onerror");
  });

  it("iframe 的 javascript: src 被拦", () => {
    expect(sanitizeRichTextForEdit('<iframe src="javascript:alert(1)"></iframe>')).not.toContain("javascript:");
  });

  it("自定义节点与存量常规标签同样保留", () => {
    const out = sanitizeRichTextForEdit(
      '<section data-zf-node="callout" data-variant="danger"><p>x</p></section><table><tbody><tr><td>y</td></tr></tbody></table>',
    );
    expect(out).toContain('data-zf-node="callout"');
    expect(out).toContain("<table>");
  });
});

describe("存量内容不回归", () => {
  it("wangEditor 常规产出（标题/加粗/引用/列表/图片/表格）原样保留", () => {
    const html =
      '<h2>使用说明</h2><p><strong>12 周岁及以上</strong>适用</p><blockquote>温馨提示</blockquote><ul><li>逐条确认</li></ul><img src="https://example.com/a.jpg" width="300"><table><tbody><tr><td colspan="2">x</td></tr></tbody></table>'
    const out = sanitizeRichText(html)
    for (const frag of ['<h2>', '<strong>', '<blockquote>', '<li>', '<img', 'colspan="2"']) {
      expect(out).toContain(frag)
    }
  })

  it("空输入返回空串", () => {
    expect(sanitizeRichText('')).toBe('')
    expect(sanitizeRichText(null)).toBe('')
    expect(sanitizeRichText(undefined)).toBe('')
  })
})
